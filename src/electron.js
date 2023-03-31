"use strict";
exports.__esModule = true;
var electron_1 = require("electron");
var path = require("path");
function createWindow() {
    var win = new electron_1.BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    win.loadURL("http://localhost:3000");
    //   win.loadFile(path.join(__dirname, '../public/index.html'));
    electron_1.globalShortcut.register('Alt+Space', function () {
        console.log('Alt+Space is pressed');
        if (!win.isVisible()) {
            // windowを表示する
            win.show();
            // 他のwindowより手前に表示する
            //win.setAlwaysOnTop(true, 'floating');
            // windowをアクティブにする
            win.focus();
            win.webContents.send('focus');
        }
        else {
            // windowを非表示にする
            win.hide();
        }
    });
}
electron_1.app.whenReady().then(createWindow);
electron_1.app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', function () {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
