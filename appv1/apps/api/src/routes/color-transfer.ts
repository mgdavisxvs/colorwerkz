import type { Express, Request, Response } from 'express';

interface ColorTransferBody {
  image?: string;
  method?: string;
}

async function callPythonService(baseUrl: string, payload: ColorTransferBody) {
  const url = new URL('/color/transfer', baseUrl).toString();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Python service error ${res.status}: ${text}`);
  }
  return res.json();
}

export function registerColorTransfer(app: Express, pythonServiceBase: string) {
  app.post('/api/v2/color-transfer', async (req: Request, res: Response) => {
    try {
      const body = req.body as ColorTransferBody;
      if (!body || typeof body.image !== 'string' || body.image.length === 0) {
        return res.status(400).json({ error: 'image (base64) is required' });
      }
      const method = typeof body.method === 'string' ? body.method : 'pytorch';
      const result = await callPythonService(pythonServiceBase, { image: body.image, method });
      return res.status(200).json({ ...result, method });
    } catch (err: any) {
      return res.status(502).json({ error: err?.message ?? 'Upstream error' });
    }
  });
}
