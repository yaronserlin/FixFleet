import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import AppRoutes from './routes';
import ErrorBoundary from './components/ErrorComponent/ErrorBoundary';
import { ThemeModeProvider } from './contexts/ThemeContext';

// `registerType: 'autoUpdate'` (vite.config.js) makes the generated service
// worker take over immediately once a new version installs (skipWaiting +
// clientsClaim) and reload the page once it does -- but only once the
// browser actually checks for one, and the native check runs on a fresh
// navigation, which an installed PWA resumed from the home screen rarely
// triggers. Without an explicit check, a new deploy could sit unnoticed
// indefinitely, and the only way to pick it up was to delete and reinstall
// the app. Polling `registration.update()` hourly and on every foreground
// closes that gap, so a new build reaches installed devices on its own.
if ('serviceWorker' in navigator) {
  registerSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const checkForUpdate = () => registration.update().catch(() => {});
      setInterval(checkForUpdate, 60 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate();
      });
    },
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeModeProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ThemeModeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
