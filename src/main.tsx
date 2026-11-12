import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { registerKanjiFace } from './appearance';
import './styles/index.css';

// Before the first render, so the title cards never draw a frame in a fallback face.
registerKanjiFace();

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
