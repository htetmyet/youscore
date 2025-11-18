import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import router from './routes';
import { config } from './config';

const allowedOrigins = config.clientOrigin.split(',').map((origin) => origin.trim());
const allowAll = allowedOrigins.includes('*');

export const app = express();

app.use(cors({ origin: allowAll ? true : allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use('/api', router);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});
