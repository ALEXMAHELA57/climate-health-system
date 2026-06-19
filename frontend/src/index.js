import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

// ── Service worker registration with automatic silent update ──────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then((reg) => {

      // Check for a new service worker every 30 seconds while app is open
      setInterval(() => reg.update(), 30 * 1000);

      // When a new SW finishes installing, activate it immediately
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // A new version is ready — tell it to take over right away
            newWorker.postMessage('SKIP_WAITING');
          }
        });
      });
    }).catch(() => {});

    // Reload the page automatically the moment the new SW takes control —
    // this is what actually delivers the update without any user action
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}
