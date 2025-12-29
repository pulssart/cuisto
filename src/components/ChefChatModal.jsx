import { useState, useEffect, useRef } from 'react';
import { CloseIcon } from './icons';
import { chatWithChef } from '../services/openai';
import './ChefChatModal.css';

// Fonction pour formater le markdown (gras, italique, etc.)
function formatMessage(text) {
  if (!text) return '';

  // Convertir le markdown en éléments React
  const parts = [];
  
  // Regex pour **gras** et *italique*
  const boldRegex = /\*\*(.+?)\*\*/g;
  const italicRegex = /\*(.+?)\*/g;
  
  // Trouver tous les matches
  const matches = [];
  let match;
  
  // Gras
  while ((match = boldRegex.exec(text)) !== null) {
    matches.push({
      type: 'bold',
      start: match.index,
      end: match.index + match[0].length,
      content: match[1]
    });
  }
  
  // Italique (seulement si pas déjà dans un gras)
  while ((match = italicRegex.exec(text)) !== null) {
    const isInBold = matches.some(m => 
      m.type === 'bold' && 
      match.index >= m.start && 
      match.index < m.end
    );
    if (!isInBold) {
      matches.push({
        type: 'italic',
        start: match.index,
        end: match.index + match[0].length,
        content: match[1]
      });
    }
  }
  
  // Trier par position
  matches.sort((a, b) => a.start - b.start);
  
  // Si pas de matches, retourner le texte tel quel
  if (matches.length === 0) {
    return text;
  }
  
  // Construire les éléments
  let lastIndex = 0;
  matches.forEach((match, idx) => {
    // Texte avant le match
    if (match.start > lastIndex) {
      parts.push(text.substring(lastIndex, match.start));
    }
    
    // Le match formaté
    if (match.type === 'bold') {
      parts.push(<strong key={`bold-${idx}`}>{match.content}</strong>);
    } else if (match.type === 'italic') {
      parts.push(<em key={`italic-${idx}`}>{match.content}</em>);
    }
    
    lastIndex = match.end;
  });
  
  // Texte restant
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts;
}

// Fonction pour découper un texte en chunks pour le streaming
function chunkText(text, chunkSize = 3) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}

export default function ChefChatModal({ isOpen, onClose, recipe }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [streamingMessage, setStreamingMessage] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const streamingTimeoutRef = useRef(null);

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
  }, [messages, streamingMessage]);

  // Cleanup du streaming à la fermeture
  useEffect(() => {
    return () => {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
    };
  }, []);

  // Fonction pour streamer un message progressivement
  const streamMessage = (fullText) => {
    setStreamingMessage('');
    
    // Ajuster la taille des chunks selon la longueur du message
    const chunkSize = fullText.length > 200 ? 3 : 2;
    const chunks = chunkText(fullText, chunkSize);
    let currentIndex = 0;

    const streamNext = () => {
      if (currentIndex < chunks.length) {
        setStreamingMessage(prev => prev + chunks[currentIndex]);
        currentIndex++;
        
        // Vitesse variable : plus rapide pour les espaces et ponctuation, plus lent pour le texte
        const chunk = chunks[currentIndex - 1];
        let delay = 25; // Délai par défaut
        
        if (chunk.match(/^\s+$/)) {
          // Espaces uniquement : très rapide
          delay = 10;
        } else if (chunk.match(/[.,!?;:]/)) {
          // Ponctuation : pause plus longue
          delay = 50;
        } else if (chunk.match(/\s/)) {
          // Contient des espaces : rapide
          delay = 20;
        } else {
          // Texte normal : vitesse normale
          delay = 30;
        }
        
        streamingTimeoutRef.current = setTimeout(streamNext, delay);
      } else {
        // Streaming terminé, ajouter le message complet à l'historique
        setMessages(prev => [...prev, { role: 'assistant', content: fullText }]);
        setStreamingMessage('');
        setIsLoading(false);
        
        // Re-focus sur l'input
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 100);
      }
    };

    streamNext();
  };

  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setError(null);

    // Ajouter le message de l'utilisateur
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);
    setStreamingMessage('');

    try {
      const response = await chatWithChef(recipe, newMessages);
      // Streamer la réponse progressivement
      streamMessage(response);
    } catch (err) {
      console.error('Erreur chat:', err);
      setError(err.message || 'Erreur lors de la conversation avec le chef');
      // Retirer le message utilisateur en cas d'erreur pour permettre de réessayer
      setMessages(messages);
      setIsLoading(false);
      setStreamingMessage('');
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
                  {formatMessage(message.content)}
                </div>
              </div>
            ))}
            {streamingMessage && (
              <div className="chef-chat-message chef-message">
                <div className="message-content">
                  {formatMessage(streamingMessage)}
                  <span className="streaming-cursor">|</span>
                </div>
              </div>
            )}
            {isLoading && !streamingMessage && (
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

