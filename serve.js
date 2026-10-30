const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const port = Number(process.env.PORT || 3000);
const page = path.join(__dirname, 'elementaryparticles.html');

const server = http.createServer(async (req, res) => {
  const pathname = req.url.split('?')[0];
  if (pathname !== '/' && pathname !== '/elementaryparticles.html') {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }

  try {
    const html = await fs.readFile(page);
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(html);
  } catch (error) {
    console.error(error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Unable to read elementaryparticles.html');
  }
});

server.on('error', (error) => {
  console.error(`Unable to start server: ${error.message}`);
  process.exitCode = 1;
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Open http://127.0.0.1:${server.address().port} in your browser`);
});
