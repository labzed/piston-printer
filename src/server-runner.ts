import * as express from 'express';
import * as http from 'http';
import createServer from './create-server';
import { IServerOptions } from './types';

export default class ServerRunner {
  private app: express.Application;
  private httpServer?: http.Server;
  constructor(options: IServerOptions) {
    this.app = createServer(options);
  }

  public start(port: number | string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer = this.app.listen(port, resolve);
      this.app.on('error', reject);
    });
  }

  public async stop() {
    return new Promise((resolve, reject) => {
      if (this.httpServer) {
        this.httpServer.close((error: Error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      }
    });
  }
}
