import * as debugFactory from 'debug';
import * as express from 'express';

const debug = debugFactory('piston-printer');

const localAddresses = ['127.0.0.1', '::ffff:127.0.0.1', '::1'];

function isLocalAddress(address: string): boolean {
  return localAddresses.includes(address);
}

export function denyRemoteConnections(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const remoteAddress = req.connection.remoteAddress;
  if (remoteAddress && isLocalAddress(remoteAddress)) {
    next();
    return;
  }
  debug(`Restricted local connection: ${req.connection.remoteAddress}`);
  res
    .type('text')
    .status(401)
    .send('Restricted to local connections only');
}

export function handleStatic404(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  res
    .status(404)
    .type('text')
    .set('x-piston-printer-error', 'AssetNotFound')
    .send();
}

export function handle404(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  res
    .type('text')
    .status(404)
    .send();
}
