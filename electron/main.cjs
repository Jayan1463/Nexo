const { app, BrowserWindow } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

let staticServer = null;

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.woff2') return 'font/woff2';
  return 'application/octet-stream';
}

function startStaticServer() {
  const distDir = path.join(__dirname, '..', 'dist');

  staticServer = http.createServer((req, res) => {
    const requestedPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const safePath = requestedPath === '/' ? '/index.html' : requestedPath;
    const filePath = path.join(distDir, safePath);

    if (!filePath.startsWith(distDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        const fallback = path.join(distDir, 'index.html');
        fs.readFile(fallback, (fallbackErr, fallbackData) => {
          if (fallbackErr) {
            res.writeHead(404);
            res.end('Not found');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(fallbackData);
        });
        return;
      }
      res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
      res.end(data);
    });
  });

  return new Promise((resolve, reject) => {
    staticServer.once('error', reject);
    staticServer.listen(0, '127.0.0.1', () => {
      const address = staticServer.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Unable to determine static server address.'));
        return;
      }
      resolve(`http://localhost:${address.port}`);
    });
  });
}

function createWindow() {
  const win = new BrowserWindow({
    title: 'Nexo Cloud',
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#f5f6f8',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (!app.isPackaged) {
    win.loadURL('http://localhost:5173');
    return;
  }

  startStaticServer()
    .then((url) => win.loadURL(url))
    .catch(() => {
      const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
      win.loadFile(indexPath);
    });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (staticServer) {
    staticServer.close();
    staticServer = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
