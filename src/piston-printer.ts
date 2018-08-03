import * as puppeteer from 'puppeteer';
import * as qs from 'qs';
import { URL } from 'url';
import * as path from 'path';

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

  async printTemplate(
    templateName: string,
    values: ITemplateValues = {},
    options: Partial<IPrintOptions> = {}
  ): Promise<{ pdf: Buffer }> {
    console.log('renderTemplate', templateName);
    const serializedValues = JSON.stringify(values);
    const queryString = qs.stringify({
      templateName: templateName,
      values: serializedValues
    });
    const url = `http://127.0.0.1:${this.port}/render?${queryString}`;
    const t = timer();

    const page = await this.browser.newPage();
    console.log('Page opened', t.mark());
    let aborted = false;

    const pageErrorPromise = new Promise((resolve, reject) => {
      async function abort(error: Error) {
        setTimeout(async () => {
          console.log(`(${aborted}) abort(${error.message}`);
          aborted = true;
          reject(error);
          console.log('-- done rejecting --');
        }, 0);
      }
      page.on('response', response => {
        const parsedUrl = new URL(response.url());
        console.log(
          `puppeteer response: ${response.status()} ${path.basename(parsedUrl.pathname)}`
        );
        if (response.status() >= 400) {
          let url = response.url();
          const parsedUrl = new URL(url);
          if (parsedUrl.hostname === '127.0.0.1') {
            url = parsedUrl.pathname;
          }
          const neptuneMessage = response.headers()['x-neptune-error'];
          if (neptuneMessage) {
            abort(
              new Error(`Render router failed with message: ${neptuneMessage}`)
            );
          } else if (!this.allowFailedRequests) {
            abort(new Error(`Failed to load template resource: ${url}`));
          }
        }
      });

      page.on('pageerror', errorMessage => {
        console.error('puppeteer pageerror:', errorMessage);
        const error = new Error(errorMessage);
        error.name = 'PageError';
        abort(error);
      });

      page.on('error', error => {
        console.error('ACTUAL page:error', error);
        abort(error);
      });

      page.on('console', message => {
        console.log('--->', message.text());
      });
    });

    const pageGotoPromise = page
      .goto(url, { waitUntil: 'networkidle0' })
      .then(result => {
        // TODO remove this handler
        console.log('page goto load event fired', t.mark());
        return result;
      })
      .catch(err => {
        console.log('FYI pageGotoPromise rejected', err);
        throw err;
      });

    try {
      await Promise.race([pageGotoPromise, pageErrorPromise]);
      if (aborted) {
        throw new Error(
          `goto promise resolved but aborted=true already, so will not call page.pdf()`
        );
      }
      await page.screenshot();
      console.log('screenshot taken', t.mark());
      const result = { pdf: await page.pdf(options) };
      console.log('pdf generated', t.mark());
      return result;
    } catch (error) {
      throw error;
    } finally {
      await page.close();
      console.log('page closed', t.mark());
    }
  }

  close() {
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
