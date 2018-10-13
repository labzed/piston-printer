import * as debugFactory from 'debug';
import * as express from 'express';
import * as expressHandlebars from 'express-handlebars';
import * as http from 'http';
import * as path from 'path';
import {
  denyRemoteConnections,
  handle404,
  handleStatic404
} from './server-utils';
import { IServerOptions } from './types';
const debug = debugFactory('piston-printer');

export function createServer(options: IServerOptions): express.Express {
  const app = express();

  // Templating engine
  const templateExtension = 'hbs';
  const fullTemplatesDirectory = path.resolve(options.templatesDirectory);
  const templateEngine = expressHandlebars({
    extname: templateExtension,
    partialsDir: fullTemplatesDirectory
  });
  app.engine(templateExtension, templateEngine);
  app.set('views', fullTemplatesDirectory);
  app.set('view engine', templateExtension);

  app.use(denyRemoteConnections);

  app.use(
    '/assets',
    express.static(path.resolve(options.assetsDirectory), {
      fallthrough: true
    }),
    handleStatic404
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

  app.use(handle404);

  app.use(
    (
      error: Error,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      res.set('x-piston-printer-error', error.message);
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
