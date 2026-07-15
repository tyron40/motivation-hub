import app from "../backend/hono";

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

function buildHeaders(rawHeaders: Record<string, string | string[] | undefined>): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(rawHeaders)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach(v => headers.append(key, v));
    } else {
      headers.set(key, value);
    }
  }
  return headers;
}

async function readBody(req: any): Promise<Buffer | null> {
  if (req.method === 'GET' || req.method === 'HEAD') return null;

  if (req.body !== undefined) {
    if (Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === 'string') return Buffer.from(req.body);
    return Buffer.from(JSON.stringify(req.body));
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: any) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => resolve(chunks.length > 0 ? Buffer.concat(chunks) : null));
    req.on('error', reject);
  });
}

export default async function handler(req: any, res: any): Promise<void> {
  try {
    const url = `https://${req.headers.host || 'motivation-hub-iota.vercel.app'}${req.url}`;
    const headers = buildHeaders(req.headers);
    const body = await readBody(req);

    const request = new Request(url, {
      method: req.method,
      headers,
      body: body as any,
    });

    const response = await app.fetch(request);

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const responseBody = await response.arrayBuffer();
    res.end(Buffer.from(responseBody));
  } catch (error) {
    console.error('[Vercel Handler] Error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : String(error),
    }));
  }
}
