import * as debugFactory from 'debug';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import * as qs from 'qs';
import { URL } from 'url';

const debug = debugFactory('piston-printer');

interface IConstructorOptions {
  browser: puppeteer.Browser;
  port: string | number;
  server: IStoppable;
}

interface ITemplateValues {
  [key: string]: any;
}

interface IStoppable {
  stop(): void;
}

interface IPrintOptions {
  width: string;
  height: string;
  margin: {
    top: string;
    bottom: string;
    left: string;
    right: string;
  };
}

interface IPistonPrinter {
  printTemplate(
    templateName: string,
    values?: ITemplateValues,
    options?: Partial<IPrintOptions>
  ): Promise<{ pdf: Buffer }>;
}

export class PistonPrinter implements IPistonPrinter {
  private browser: puppeteer.Browser;
  private port: string;
  private allowFailedRequests: boolean;
  private server: IStoppable;

  /**
   * @param options.port Local port number
   * @param options.browser Instance of Puppeteer browser
   */
  constructor(options: IConstructorOptions) {
    this.browser = options.browser;
    this.port = String(options.port);
    this.server = options.server;
    this.allowFailedRequests = false;
  }

  public async printTemplate(
    templateName: string,
    values: ITemplateValues = {},
    options: Partial<IPrintOptions> = {}
  ): Promise<{ pdf: Buffer }> {
    const browserVersion = await this.browser.version();
    debug(`renderTemplate ${templateName} (${browserVersion})`);
    const serializedValues = JSON.stringify(values);
    const queryString = qs.stringify({
      templateName,
      values: serializedValues
    });
    const url = `http://127.0.0.1:${this.port}/render?${queryString}`;
    const t = timer();

    const page = await this.browser.newPage();
    debug(`Page opened ${t.mark()}`);
    let aborted = false;

    const pageErrorPromise = new Promise((resolve, reject) => {
      function abort(error: Error) {
        setTimeout(async () => {
          debug(`(${aborted}) abort(${error.message}`);
          aborted = true;
          reject(error);
        }, 0);
      }
      page.on('response', response => {
        const parsedUrl = new URL(response.url());
        const name = path.basename(parsedUrl.pathname);
        debug(`puppeteer response: ${response.status()} ${name}`);
        if (response.status() >= 400) {
          let errorUrl = url;
          if (parsedUrl.hostname === '127.0.0.1') {
            errorUrl = parsedUrl.pathname;
          }
          const neptuneMessage = response.headers()['x-neptune-error'];
          if (neptuneMessage) {
            abort(
              new Error(`Render router failed with message: ${neptuneMessage}`)
            );
          } else if (!this.allowFailedRequests) {
            abort(new Error(`Failed to load template resource: ${errorUrl}`));
          }
        }
      });

      page.on('pageerror', errorMessage => {
        debug(`puppeteer pageerror: ${errorMessage}`);
        const error = new Error(errorMessage);
        error.name = 'PageError';
        abort(error);
      });

      page.on('error', error => {
        debug(`puppeteer error: ${error}`);
        abort(error);
      });

      page.on('console', message => {
        debug(`puppeteer console.${message.type}: ${message.text()}`);
      });
    });

    const pageGotoPromise = page
      .goto(url, { waitUntil: 'networkidle0' })
      .then(result => {
        // TODO remove this handler
        debug(`page goto load event fired ${t.mark()}`);
        return result;
      });

    try {
      await Promise.race([pageGotoPromise, pageErrorPromise]);
      if (aborted) {
        throw new Error(
          `goto promise resolved but aborted=true already, so will not call page.pdf()`
        );
      }
      await page.screenshot();
      debug(`screenshot taken ${t.mark()}`);
      const result = { pdf: await page.pdf(options) };
      debug(`pdf generated ${t.mark()}`);
      return result;
    } catch (error) {
      throw error;
    } finally {
      await page.close();
      debug(`page closed ${t.mark()}`);
    }
  }

  public close() {
    return Promise.all([this.browser.close(), this.server.stop()]);
  }
}

function timer() {
  return {
    t: +new Date(),
    mark() {
      const result = +new Date() - this.t;
      this.t = +new Date();
      return result;
    }
  };
}
