import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './i18n.ts';
import { ThemeProvider } from './contexts/ThemeContext.tsx';

import { BrowserRouter } from 'react-router-dom';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
