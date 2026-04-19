const { app, session } = require('electron');

app.whenReady().then(() => {
  try {
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, cb) => cb({ cancel: false }));
    console.log("Registered first handler");
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, cb) => cb({ cancel: false }));
    console.log("Registered second handler");
  } catch (e) {
    console.error("Error:", e.message);
  }
  app.quit();
});
