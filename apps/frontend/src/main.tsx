import { StyleProvider } from '@ant-design/cssinjs';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { initVitalsReporter } from './utils/vitalsReporter.ts';
import './index.css';

initVitalsReporter();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');
createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <StyleProvider layer>
        <App />
      </StyleProvider>
    </BrowserRouter>
  </StrictMode>,
);
