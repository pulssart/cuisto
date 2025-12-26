import { useState, useEffect, useRef } from 'react';
import { CloseIcon } from './icons';
import { chatWithChef } from '../services/openai';
import './ChefChatModal.css';

export default function ChefChatModal({ isOpen, onClose, recipe }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Réinitialiser les messages quand la modale s'ouvre
  useEffect(() => {
    if (isOpen && recipe) {
      // Message de bienvenue initial
      setMessages([{
        role: 'assistant',
        content: `Bonjour ! 👨‍🍳 Je suis le chef et je suis là pour répondre à toutes tes questions sur cette recette de "${recipe.title}". N'hésite pas à me demander des conseils, des astuces, des alternatives d'ingrédients ou toute autre question !`
      }]);
      setInputMessage('');
      setError(null);
      // Focus sur l'input après un court délai
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, recipe]);

  // Scroll automatique vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setError(null);

    // Ajouter le message de l'utilisateur
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await chatWithChef(recipe, newMessages);
      setMessages([...newMessages, { role: 'assistant', content: response }]);
    } catch (err) {
      console.error('Erreur chat:', err);
      setError(err.message || 'Erreur lors de la conversation avec le chef');
      // Retirer le message utilisateur en cas d'erreur pour permettre de réessayer
      setMessages(messages);
    } finally {
      setIsLoading(false);
      // Re-focus sur l'input
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay chef-chat-overlay" onClick={onClose}>
      <div className="modal-content chef-chat-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header chef-chat-header">
          <h2>👨‍🍳 Discuter avec le Chef</h2>
          <button className="btn-icon modal-close" onClick={onClose} aria-label="Fermer">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="modal-body chef-chat-body">
          <div className="chef-chat-messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`chef-chat-message ${message.role === 'user' ? 'user-message' : 'chef-message'}`}
              >
                <div className="message-content">
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="chef-chat-message chef-message">
                <div className="message-content">
                  <span className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                </div>
              </div>
            )}
            {error && (
              <div className="chef-chat-error">
                ⚠️ {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chef-chat-input-container">
            <textarea
              ref={inputRef}
              className="chef-chat-input"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pose ta question au chef..."
              rows={2}
              disabled={isLoading}
            />
            <button
              className="btn-primary chef-chat-send"
              onClick={handleSend}
              disabled={!inputMessage.trim() || isLoading}
              aria-label="Envoyer"
            >
              {isLoading ? '⏳' : '➤'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

