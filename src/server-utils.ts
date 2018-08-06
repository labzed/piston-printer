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

export function fileNotFoundErrorTo404(
  err: any,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (err.code === 'ENOENT') {
    res
      .type('text')
      .status(404)
      .send();
    return;
  }
  throw err;
}
