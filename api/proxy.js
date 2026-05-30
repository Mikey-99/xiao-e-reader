const https = require('https');
const http = require('http');
const { URL } = require('url');
const zlib = require('zlib');

module.exports = function (req, res) {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    res.writeHead(400);
    res.end('no url');
    return;
  }
  fetchRaw(targetUrl, function (err, result) {
    if (err) {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
      res.end('Proxy error: ' + err.message);
      return;
    }
    const passThru = ['content-type'];
    const outHeaders = { 'Access-Control-Allow-Origin': '*' };
    passThru.forEach(function (k) { if (result.headers[k]) outHeaders[k] = result.headers[k]; });
    res.writeHead(result.status, outHeaders);
    res.end(result.body);
  });
};

function fetchRaw(targetUrl, callback, redirects) {
  if (!redirects) redirects = 0;
  if (redirects > 10) { callback(new Error('too many redirects')); return; }
  var u;
  try { u = new URL(targetUrl); } catch (e) { callback(new Error('invalid url')); return; }
  var mod = u.protocol === 'https:' ? https : http;
  var opts = {
    hostname: u.hostname,
    port: u.port || (u.protocol === 'https:' ? 443 : 80),
    path: u.pathname + u.search,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'identity'
    },
    timeout: 25000,
    rejectUnauthorized: false
  };
  var cbDone = false;
  function cbOnce(err, result) {
    if (cbDone) return;
    cbDone = true;
    callback(err, result);
  }
  var req = mod.request(opts, function (res) {
    if ([301, 302, 303, 307, 308].indexOf(res.statusCode) >= 0) {
      var loc = res.headers['location'];
      if (loc) {
        try { loc = new URL(loc, targetUrl).href; } catch (e) {}
        fetchRaw(loc, callback, redirects + 1);
        return;
      }
    }
    var chunks = [];
    var encoding = res.headers['content-encoding'];
    delete res.headers['content-encoding'];
    delete res.headers['content-length'];
    if (encoding === 'gzip' || encoding === 'deflate') {
      var unzip = encoding === 'gzip' ? zlib.createGunzip() : zlib.createInflate();
      res.pipe(unzip);
      unzip.on('data', function (c) { chunks.push(c); });
      unzip.on('end', function () { cbOnce(null, { status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }); });
      unzip.on('error', function (e) { cbOnce(e); });
    } else {
      res.on('data', function (c) { chunks.push(c); });
      res.on('end', function () { cbOnce(null, { status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }); });
    }
    res.on('error', function (e) { cbOnce(e); });
  });
  req.on('error', function (e) { cbOnce(e); });
  req.on('timeout', function () { req.destroy(); cbOnce(new Error('timeout')); });
  req.end();
}
