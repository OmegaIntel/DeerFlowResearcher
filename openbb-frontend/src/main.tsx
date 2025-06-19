import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './openbb-theme.css'
import App from './App.tsx'

console.log('OpenBB Frontend starting...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
} else {
  console.log('Root element found, mounting React app...');
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  console.log('React app mounted successfully');
}
