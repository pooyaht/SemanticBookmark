import React from 'react';
import { createRoot } from 'react-dom/client';

import { SearchPage } from './pages/SearchPage';
import './styles/common.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <SearchPage />
  </React.StrictMode>
);
