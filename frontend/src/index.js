import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

// ── Service worker registration with automatic silent update ──────────────
if ('serviceWorker' in navigator) {
  // Track whether this page load already had an active service worker
  // controlling it. If yes, a later controllerchange means a genuine
  // update happened and a reload is appropriate. If no (first ever
  // install, or this tab opened before any SW existed), a reload here
  // would just race with the app mounting and cause a blank-page flash.
  const hadControllerOnLoad = !!navigator.serviceWorker.controller;

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

    // Reload automatically when a NEW service worker takes control —
    // but only if this page was already being controlled by a previous
    // SW. On a fresh install there's nothing to "update" away from, so
    // we skip the reload and let the page render normally the first time.
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      if (!hadControllerOnLoad) return; // first-ever install — do nothing
      refreshing = true;
      window.location.reload();
    });
  });
}
