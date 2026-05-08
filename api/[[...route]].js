import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

let serverModule;

async function getServerModule() {
  if (!serverModule) {
    const serverPath = join(process.cwd(), 'dist', 'server', 'assets', 'server-DVtv3KOS.js');
    if (existsSync(serverPath)) {
      serverModule = await import(serverPath);
    } else {
      throw new Error('Server module not found');
    }
  }
  return serverModule;
}

export default async function handler(req, res) {
  try {
    const server = await getServerModule();
    const { default: handler } = server;
    
    if (handler && typeof handler.fetch === 'function') {
      const response = await handler.fetch(
        new Request(new URL(req.url, `http://${req.headers.host}`), {
          method: req.method,
          headers: req.headers,
          body: req.method !== 'GET' && req.method !== 'HEAD' ? req : undefined,
        })
      );
      
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text());
    } else {
      res.status(500).json({ error: 'Server handler not found' });
    }
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: error.message });
  }
}
