const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 800, height: 600 });
  win.loadURL('data:text/html,<h1>Hello</h1>');
  
  setTimeout(() => {
    // Unhandled promise rejection
    Promise.reject(new Error("Test unhandled rejection"));
  }, 2000);
});
