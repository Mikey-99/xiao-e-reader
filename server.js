const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const urlMod = require('url');
const os = require('os');

const PORT = process.env.PORT || 3003;

// Data directory: use env var DATA_DIR, or local './data' folder, or Desktop fallback
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const HTML = fs.readFileSync(path.join(__dirname, 'reader.html'), 'utf8');

function fetchRaw(targetUrl, postData, callback) {
  const u = urlMod.parse(targetUrl);
  const mod = u.protocol === 'https:' ? https : http;
  const opts = {
    hostname: u.hostname,
    port: u.port || (u.protocol === 'https:' ? 443 : 80),
    path: u.path + (u.search || ''),
    method: postData ? 'POST' : 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate',
      'DNT': '1'
    },
    timeout: 30000,
    rejectUnauthorized: false
  };
  if (postData) {
    opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    opts.headers['Content-Length'] = Buffer.byteLength(postData);
  }
  const req = mod.request(opts, function (res) {
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => callback(null, { status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
  });
  req.on('error', e => callback(e));
  req.on('timeout', () => { req.destroy(); callback(new Error('timeout')); });
  if (postData) req.write(postData);
  req.end();
}

const PASS_THRU = ['content-type', 'content-encoding', 'content-length', 'transfer-encoding'];

const server = http.createServer(function (req, res) {
  const u = urlMod.parse(req.url, true);

  if (u.pathname === '/proxy') {
    const target = u.query.url;
    if (!target) { res.writeHead(400); res.end('no url'); return; }
    let body = '';
    req.on('data', c => body += c);
    req.on('end', function () {
      fetchRaw(target, req.method === 'POST' && body ? body : null, function (err, result) {
        if (err) {
          res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
          res.end('Proxy error: ' + err.message);
          return;
        }
        const outHeaders = { 'Access-Control-Allow-Origin': '*' };
        PASS_THRU.forEach(k => { if (result.headers[k]) outHeaders[k] = result.headers[k]; });
        res.writeHead(result.status, outHeaders);
        res.end(result.body);
      });
    });
    return;
  }

  if (u.pathname === '/ping') { res.writeHead(200); res.end('pong'); return; }

  // Data persistence API
  if (u.pathname === '/api/data') {
    const name = u.query.name || '';
    if (!['history', 'bookshelf'].includes(name)) { res.writeHead(400); res.end('invalid name'); return; }
    const file = path.join(DATA_DIR, name + '.json');
    if (req.method === 'GET') {
      try {
        const data = fs.readFileSync(file, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(data);
      } catch { res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end('[]'); }
      return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          fs.writeFileSync(file, body, 'utf8');
          res.writeHead(200, { 'Access-Control-Allow-Origin': '*' }); res.end('ok');
        } catch (e) { res.writeHead(500); res.end(e.message); }
      });
      return;
    }
    res.writeHead(405); res.end();
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });
  res.end(HTML);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('小e阅读器网页版已启动: http://localhost:' + PORT);
});
