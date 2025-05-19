import * as fs from 'fs';
import * as path from 'path';

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
};

export function httpHandler(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const pathname = path.normalize(url.pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(process.cwd(), 'front', pathname);

  fs.promises.readFile(filePath)
    .then(data => {
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(data);
    })
    .catch(() => {
      const fallback = path.join(process.cwd(), 'front', 'index.html');
      fs.promises.readFile(fallback)
        .then(html => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(html);
        })
        .catch(() => {
          res.writeHead(500);
          res.end('Error loading index.html');
        });
    });
}
