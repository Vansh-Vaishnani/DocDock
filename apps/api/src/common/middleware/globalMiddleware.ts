import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import { config } from '../config';

export const registerGlobalMiddleware = (app: express.Express): void => {
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb', type: 'application/json' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb', type: 'application/x-www-form-urlencoded' }));
  app.use(cookieParser(config.cookieSecret));
  app.use(morgan('dev'));
};
