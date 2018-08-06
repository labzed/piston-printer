import * as debugFactory from 'debug';
import * as express from 'express';
import * as http from 'http';
import * as Liquid from 'liquidjs';
import * as path from 'path';
import { denyRemoteConnections, fileNotFoundErrorTo404 } from './server-utils';
const debug = debugFactory('piston-printer');

export function createServer(options: IServerOptions): express.Express {
  const liquidEngine = Liquid();
  const app = express();

  app.engine('html', liquidEngine.express());
  app.set('views', path.resolve(options.templatesDirectory));
  app.set('view engine', 'html');

  app.use(denyRemoteConnections);

  app.use(
    '/assets',
    express.static(path.resolve(options.assetsDirectory), {
      fallthrough: false
    }),
    fileNotFoundErrorTo404
  );

  app.get('/render/', (req, res, next) => {
    const templateName: string | undefined = req.query.templateName;
    if (!templateName) {
      res
        .type('text')
        .status(404)
        .send();
      return;
    }

    let values: { [key: string]: any } = {};
    const serializedValues: string | undefined = req.query.values;
    if (serializedValues) {
      try {
        values = JSON.parse(serializedValues);
      } catch (error) {
        res.status(400).send();
        return;
      }
    }

    res.render(templateName, values);
  });

  app.use((req, res, next) => {
    res
      .type('text')
      .status(400)
      .send();
  });

  app.use(
    (
      error: Error,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      res.set('x-neptune-error', error.message);
      debug(`[sending 500] ${error.message}`);

      res
        .status(500)
        .type('text')
        .send();
    }
  );
  return app;
}

export class MyServer {
  private app: express.Application;
  private httpServer?: http.Server;
  constructor(options: IServerOptions) {
    this.app = createServer(options);
  }

  public start(port: number | string) {
    return new Promise((resolve, reject) => {
      this.httpServer = this.app.listen(port, resolve);
      this.app.on('error', reject);
    });
  }

  public stop() {
    if (this.httpServer) {
      this.httpServer.close();
    }
  }
}
