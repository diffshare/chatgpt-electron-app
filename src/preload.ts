import { ipcRenderer, clipboard } from 'electron';

declare global {
    interface Window {
        ipcRenderer: typeof ipcRenderer;
        clipboard: typeof clipboard;
    }
}

window.ipcRenderer = ipcRenderer;
window.clipboard = clipboard;
