import React from 'react';
import ReactDOM from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App';
import { OpportunitiesProvider } from './store/opportunities';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OpportunitiesProvider>
      <App />
    </OpportunitiesProvider>
  </React.StrictMode>,
);
