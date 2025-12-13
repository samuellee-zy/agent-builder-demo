/**
 * @file src/index.tsx
 * @description Application Entry Point.
 * 
 * RESPONSIBILITIES:
 * 1. **Mounting**: Finds `#root` element and hydrates the React integration.
 * 2. **Context**: Wraps `App` logic (typically for Providers, though `App.tsx` handles most state).
 * 3. **Strict Mode**: Enforces React best practices in development.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);