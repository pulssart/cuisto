import { useState, useEffect } from 'react';
import { CloseIcon } from './icons';
import { getApiKey, saveApiKey, removeApiKey } from '../services/storage';
import './SettingsModal.css';

export default function SettingsModal({ isOpen, onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const key = getApiKey();
      const timeoutId = setTimeout(() => {
        setApiKey(key || '');
        setSaved(false);
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (apiKey.trim()) {
      saveApiKey(apiKey.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleRemove = () => {
    removeApiKey();
    setApiKey('');
    setShowKey(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Paramètres</h2>
          <button className="btn-icon modal-close" onClick={onClose} aria-label="Fermer">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="settings-section">
            <h3>Clé API OpenAI</h3>
            <p className="settings-description">
              Entrez votre clé API OpenAI pour générer des recettes et des images.
              Vous pouvez obtenir une clé sur{' '}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
                platform.openai.com
              </a>
            </p>

            <div className="api-key-input-group">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="sk-..."
                className="api-key-input"
              />
              <button
                type="button"
                className="btn-secondary show-key-btn"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? 'Masquer' : 'Afficher'}
              </button>
            </div>

            <div className="api-key-status">
              {apiKey ? (
                <span className="status-configured">✓ Clé API configurée</span>
              ) : (
                <span className="status-not-configured">⚠ Clé API non configurée</span>
              )}
            </div>

            <div className="settings-actions">
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={!apiKey.trim()}
              >
                {saved ? '✓ Sauvegardé !' : 'Sauvegarder'}
              </button>
              {apiKey && (
                <button className="btn-secondary btn-danger" onClick={handleRemove}>
                  Supprimer la clé
                </button>
              )}
            </div>
          </div>

          <div className="settings-section settings-info">
            <h3>À propos de Cuisto</h3>
            <p>
              Cuisto utilise les modèles GPT-5.2 pour la génération de recettes
              et GPT-Image-1.5 pour les images.
            </p>
            <p className="text-muted">
              Votre clé API est stockée localement sur votre appareil et n'est jamais partagée.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

