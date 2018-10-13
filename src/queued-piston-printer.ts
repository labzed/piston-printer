import * as debugFactory from 'debug';
import * as PQueue from 'p-queue';
import {
  IPdfOptions,
  IPistonPrinter,
  IPrinterOptions,
  ITemplateValues
} from './types';
const debug = debugFactory('piston-printer');

export default class QueuedPistonPrinter implements IPistonPrinter {
  private queue: PQueue;
  private printer: IPistonPrinter;

  constructor(printer: IPistonPrinter) {
    this.printer = printer;
    this.queue = new PQueue({ concurrency: 3 });
  }

  public printTemplate(
    templateName: string,
    values?: ITemplateValues,
    options?: Partial<IPdfOptions>,
    printerOptions?: Partial<IPrinterOptions>
  ): Promise<{ pdf: Buffer }> {
    debug(
      `Adding printTemplate to queue size=${this.queue.size} pending=${
        this.queue.pending
      }`
    );
    return this.queue.add(() =>
      this.printer.printTemplate(templateName, values, options, printerOptions)
    );
  }

  public async close() {
    debug('close queue');
    await this.queue.onIdle();
    debug('queue is drained');
    return this.printer.close();
  }
}
