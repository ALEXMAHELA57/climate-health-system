import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

// Register service worker with update detection
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => {
        // Check for updates every 60 seconds while app is open
        setInterval(() => reg.update(), 60 * 1000);
        console.log('SW registered');
      })
      .catch(err => console.log('SW registration failed:', err));
  });
}
