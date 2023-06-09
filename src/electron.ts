import { app, BrowserWindow, clipboard, globalShortcut } from 'electron';
import * as path from 'path';

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadURL("http://localhost:3000");
//   win.loadFile(path.join(__dirname, '../public/index.html'));
    globalShortcut.register('Alt+Space', () => {
        console.log('Alt+Space is pressed');

        if (!win.isFocused()) {
            // windowを表示する
            win.show();

            // 他のwindowより手前に表示する
            //win.setAlwaysOnTop(true, 'floating');

            // windowをアクティブにする
            win.focus();

            win.webContents.send('focus');
        } else {
            // windowを非表示にする
            win.hide();
        }
    });
    globalShortcut.register('Ctrl+Alt+C', () => {
      console.log('Ctrl+Alt+C is pressed');
      // windowを表示する
      win.show();
      // windowをアクティブにする
      win.focus();
      win.webContents.send('focus');
      win.webContents.send('paste');
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
