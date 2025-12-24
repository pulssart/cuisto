import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initStorage } from './services/storage'

// Initialiser IndexedDB au démarrage
initStorage().then(() => {
  console.info('Cuisto prêt !');
}).catch((error) => {
  console.error('Erreur initialisation storage:', error);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
