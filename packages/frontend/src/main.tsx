import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { clientLogger } from './utils/logger'

// Global client error logging
window.addEventListener('error', (event) => {
  clientLogger.error('Window', `Uncaught Client Exception: ${event.message}`, event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  clientLogger.error('Promise', `Unhandled Rejection: ${event.reason?.message || event.reason}`, event.reason);
});

clientLogger.info('App', '🛡️ RISERANGER 2 Frontend UI initialized');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
