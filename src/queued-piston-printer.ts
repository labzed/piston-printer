import * as PQueue from 'p-queue';
import {
  IPdfOptions,
  IPistonPrinter,
  IPrinterOptions,
  ITemplateValues
} from './types';

export default class QueuedPistonPrinter implements IPistonPrinter {
  private queue: PQueue;
  private printer: IPistonPrinter;

  constructor(printer: IPistonPrinter) {
    this.printer = printer;
    this.queue = new PQueue({ concurrency: 1 });
  }

  public printTemplate(
    templateName: string,
    values?: ITemplateValues,
    options?: Partial<IPdfOptions>,
    printerOptions?: Partial<IPrinterOptions>
  ): Promise<{ pdf: Buffer }> {
    return this.queue.add(() =>
      this.printer.printTemplate(templateName, values, options, printerOptions)
    );
  }

  public close() {
    return this.printer.close();
  }
}
