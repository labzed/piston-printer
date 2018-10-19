import * as debugFactory from 'debug';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import * as qs from 'qs';
import {
  IConstructorOptions,
  IPdfOptions,
  IPistonPrinter,
  IPrinterOptions,
  IStoppable,
  ITemplateValues
} from './types';

import { URL } from 'url';
import { Timer } from './timer';

const debug = debugFactory('piston-printer');

export class PistonPrinter implements IPistonPrinter {
  private browser: puppeteer.Browser;
  private port: string;
  private server: IStoppable;
  private closed: boolean;

  /**
   * @param options.port Local port number
   * @param options.browser Instance of Puppeteer browser
   */
  constructor(options: IConstructorOptions) {
    this.browser = options.browser;
    this.port = String(options.port);
    this.server = options.server;
    this.closed = false;
  }

  public async printTemplate(
    templateName: string,
    values: ITemplateValues = {},
    options: Partial<IPdfOptions> = {},
    printerOptions: Partial<IPrinterOptions> = {
      waitUntilEvent: 'networkidle0'
    }
  ): Promise<{ pdf: Buffer }> {
    const t = new Timer();

    if (this.closed) {
      throw new Error(
        'Called printTemplate() after printer was already shut down with close()'
      );
    }
    const browserVersion = await this.browser.version();
    debug(`renderTemplate ${templateName} (${browserVersion}) ${t.mark()}`);
    const serializedValues = JSON.stringify(values);
    const queryString = qs.stringify({
      templateName,
      values: serializedValues
    });
    const url = `http://127.0.0.1:${this.port}/render?${queryString}`;

    const page = await this.browser.newPage();
    debug(`Page opened ${t.mark()}`);
    let aborted = false;

    const pageReadyCallPromise = new Promise((resolve, reject) => {
      debug('exposing windows.ready()');
      page.exposeFunction('ready', () => {
        debug('window.ready() called');
        resolve();
      });
    });

    const pageErrorPromise = new Promise((resolve, reject) => {
      function abort(error: Error) {
        setTimeout(async () => {
          debug(`abort(${error.name}: ${error.message}) (aborted=${aborted})`);
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
          const headers = response.headers();
          const neptuneErrorName = headers['x-piston-printer-error'];
          if (neptuneErrorName) {
            if (
              neptuneErrorName === 'AssetNotFound' &&
              printerOptions.allowFailedRequests
            ) {
              return;
            }
            abort({
              message: errorUrl,
              name: neptuneErrorName
            } as Error);
          }
        }
      });

      page.on('pageerror', error => {
        debug(`puppeteer pageerror: ${error.name}: ${error.message}`);
        abort(error);
      });

      page.on('error', error => {
        debug(`puppeteer error: ${error}`);
        abort(error);
      });

      page.on('console', message => {
        debug(`puppeteer console.${message.type()}: ${message.text()}`);
      });
    });

    const pageNavigationPromise = page
      .goto(url, { waitUntil: printerOptions.waitUntilEvent })
      .then(result => {
        debug(`page goto load event fired ${t.mark()}`);
        return result;
      });

    try {
      await Promise.race([
        pageReadyCallPromise,
        pageNavigationPromise,
        pageErrorPromise
      ]);
      if (aborted) {
        throw new Error(`piston-printer already aborted`);
      }
      // The screenshot workaround can fix an issue with web fonts
      // not rendering properly when using the "load" event.
      // await page.screenshot();
      // debug(`screenshot taken ${t.mark()}`);
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
    debug('close(): shutting down piston-printer');
    this.closed = true;
    return Promise.all([this.browser.close(), this.server.stop()]);
  }
}
