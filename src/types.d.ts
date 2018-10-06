import * as puppeteer from 'puppeteer';

export interface IServerOptions {
  templatesDirectory: string;
  assetsDirectory: string;
}

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

interface IPdfOptions {
  width: string;
  height: string;
  margin: {
    top: string;
    bottom: string;
    left: string;
    right: string;
  };
}

interface IPrinterOptions {
  waitUntilEvent: 'networkidle0' | 'networkidle2' | 'load';
}

interface IPistonPrinter {
  printTemplate(
    templateName: string,
    values?: ITemplateValues,
    options?: Partial<IPdfOptions>,
    printerOptions?: Partial<IPrinterOptions>
  ): Promise<{ pdf: Buffer }>;

  close(): void;
}
