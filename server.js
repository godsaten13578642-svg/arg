const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = process.env.ORPHEUS_DATA_FILE
  ? path.resolve(process.env.ORPHEUS_DATA_FILE)
  : path.join(DATA_DIR, 'global-state.json');
const PORT = Number(process.env.PORT || 3000);
const clients = new Set();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function ensureDataFile() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2));
  }
}

function readState() {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) || {};
  } catch {
    return {};
  }
}

function writeState(state) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}


function broadcast(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {}
  }
}

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error('Body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

function safeFilePath(urlPath) {
  const normalized = path.normalize(decodeURIComponent(urlPath)).replace(/^([.][.][/\\])+/, '');
  const relative = normalized === '/' ? 'index.html' : normalized.replace(/^[/\\]+/, '');
  const filePath = path.join(ROOT, relative);
  if (!filePath.startsWith(ROOT)) return null;
  return filePath;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/healthz') {
    return sendJson(res, 200, { ok: true });
  }

  if (url.pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
    });
    res.write('retry: 2000\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  if (url.pathname.startsWith('/api/state/')) {
    const key = url.pathname.slice('/api/state/'.length);
    if (!key) return sendJson(res, 400, { ok: false, error: 'Missing key.' });

    if (req.method === 'GET') {
      const state = readState();
      return sendJson(res, 200, { ok: true, item: state[key] || null });
    }

    if (req.method === 'PUT') {
      try {
        const raw = await readBody(req);
        const payload = raw ? JSON.parse(raw) : {};
        if (!payload || typeof payload !== 'object' || !('value' in payload)) {
          return sendJson(res, 400, { ok: false, error: 'Payload must include value.' });
        }

        const state = readState();
        const current = state[key] || { value: null, updatedAt: 0 };
        const nextUpdatedAt = Number(payload.updatedAt) || Date.now();
        const next = { value: payload.value, updatedAt: nextUpdatedAt };
        state[key] = nextUpdatedAt >= Number(current.updatedAt || 0) ? next : current;
        writeState(state);
        broadcast({ key, item: state[key] });
        return sendJson(res, 200, { ok: true, item: state[key] });
      } catch (error) {
        return sendJson(res, 400, { ok: false, error: error.message || 'Invalid JSON.' });
      }
    }

    return sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method not allowed');
    return;
  }

  const filePath = safeFilePath(url.pathname);
  if (!filePath) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  let finalPath = filePath;
  if (fs.existsSync(finalPath) && fs.statSync(finalPath).isDirectory()) {
    finalPath = path.join(finalPath, 'index.html');
  }

  if (!fs.existsSync(finalPath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const ext = path.extname(finalPath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  fs.createReadStream(finalPath).pipe(res);
});

server.listen(PORT, () => {
  ensureDataFile();
  console.log(`ORPHEUS server listening on http://localhost:${PORT}`);
});
