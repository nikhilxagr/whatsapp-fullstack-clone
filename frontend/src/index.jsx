import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import useServerStore from './store/useServerStore';

// Auto-warm backend on page visit
useServerStore.getState().warmUp();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
