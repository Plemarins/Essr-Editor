const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const express = require('express');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html');

  // Expressサーバー（ライブプレビュー用）
  const server = express();
  server.use(express.static(path.join(__dirname, 'public')));
  server.listen(3000, () => console.log('Preview server running on http://localhost:3000'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ファイルエクスプローラー用のIPC
ipcMain.on('get-files', (event, dirPath) => {
  const workspacePath = path.join(__dirname, 'public', 'workspace');
  fs.ensureDirSync(workspacePath);
  const files = fs.readdirSync(workspacePath).map(file => ({
    name: file,
    path: path.join(workspacePath, file),
    isDirectory: fs.statSync(path.join(workspacePath, file)).isDirectory(),
  }));
  event.reply('files-list', files);
});

// ファイル読み書き
ipcMain.on('read-file', (event, filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  event.reply('file-content', content);
});

ipcMain.on('save-file', (event, { filePath, content }) => {
  fs.writeFileSync(filePath, content);
});
