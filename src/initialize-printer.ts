import * as getPort from 'get-port';
import * as puppeteer from 'puppeteer';
import { MyServer } from './create-server';
import { PistonPrinter } from './piston-printer';
import QueuedPistonPrinter from './queued-piston-printer';
import { IServerOptions } from './types';

export async function initializePrinter(options: IServerOptions) {
  if (!options.assetsDirectory) {
    throw new Error('Missing option: assetsDirectory');
  }

  if (!options.templatesDirectory) {
    throw new Error('Missing option: templatesDirectory');
  }

  const port = await getPort();
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const server = new MyServer(options);

  await server.start(port);
  const printer = new PistonPrinter({ port, browser, server });
  return new QueuedPistonPrinter(printer);
}
