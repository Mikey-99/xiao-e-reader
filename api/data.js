// Vercel serverless function for data persistence
// Since Vercel is stateless, we return empty arrays.
// The frontend preserves localStorage data when API returns empty.
module.exports = function (req, res) {
  const origin = req.headers['origin'] || '*';
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  if (req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-store'
    });
    res.end('[]');
    return;
  }

  if (req.method === 'POST') {
    // Accept but don't persist (stateless)
    res.writeHead(200, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end('ok');
    return;
  }

  res.writeHead(405);
  res.end();
};
