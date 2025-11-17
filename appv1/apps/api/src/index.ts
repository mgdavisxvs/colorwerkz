import express from 'express';
import cors from 'cors';
import { registerColorTransfer } from './routes/color-transfer';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

const PY_SERVICE_BASE = process.env.PY_SERVICE_BASE || 'http://localhost:8001';
registerColorTransfer(app, PY_SERVICE_BASE);

const port = process.env.PORT || 5000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on :${port}`);
});
