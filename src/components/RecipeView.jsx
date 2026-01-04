import { useState, useEffect, useRef } from 'react';
import { 
  ServingsIcon, 
  PrepTimeIcon, 
  CookTimeIcon, 
  RestTimeIcon,
  BookmarkIcon,
  ArrowLeftIcon,
  CloseIcon
} from './icons';
import { saveRecipe } from '../services/storage';
import { generateChefAudio } from '../services/openai';
import ShoppingListModal from './ShoppingListModal';
import ChefChatModal from './ChefChatModal';
import './RecipeView.css';

export default function RecipeView({ recipe, onBack, onSaved }) {
  // Vérifie si la recette a déjà un ID (= déjà sauvegardée)
  const [isSaved, setIsSaved] = useState(!!recipe.id);
  const [saving, setSaving] = useState(false);
  const [isImageFullscreen, setIsImageFullscreen] = useState(false);
  const [selectedStepIllustration, setSelectedStepIllustration] = useState(null);
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [isChefChatOpen, setIsChefChatOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  // États pour l'audio du chef
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const audioRef = useRef(null);
  const audioUrlRef = useRef(null);

  // Utilise l'image HD si disponible, sinon le thumbnail (pour recettes sauvegardées)
  const displayImage = recipe.image || recipe.thumbnail;

  // Réinitialise l'état quand la recette change
  useEffect(() => {
    setIsSaved(!!recipe.id);
    setIsImageFullscreen(false);
    setSelectedStepIllustration(null);
    // Reset audio state
    setIsPlayingAudio(false);
    setIsLoadingAudio(false);
    setAudioError(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, [recipe]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  // Lecture du commentaire du chef
  const handlePlayChefComment = async () => {
    if (!recipe.chefComment) return;
    
    // Si déjà en lecture, on met en pause
    if (isPlayingAudio && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
      return;
    }
    
    // Si l'audio est déjà chargé, on le relance
    if (audioRef.current && audioUrlRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlayingAudio(true);
      return;
    }
    
    // Utiliser l'audio pré-généré si disponible, sinon générer à la demande
    let audioUrlToUse = recipe.audioUrl;
    
    if (!audioUrlToUse) {
      // Fallback : générer l'audio pour les anciennes recettes
      setIsLoadingAudio(true);
      setAudioError(null);
      
      try {
        audioUrlToUse = await generateChefAudio(recipe.chefComment);
      } catch (error) {
        console.error('Erreur TTS:', error);
        setAudioError(error.message || 'Erreur lors de la génération audio');
        setIsLoadingAudio(false);
        return;
      } finally {
        setIsLoadingAudio(false);
      }
    }
    
    // Charger et jouer l'audio
    try {
      audioUrlRef.current = audioUrlToUse;
      
      const audio = new Audio(audioUrlToUse);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsPlayingAudio(false);
      };
      
      audio.onerror = () => {
        setAudioError('Erreur de lecture audio');
        setIsPlayingAudio(false);
      };
      
      await audio.play();
      setIsPlayingAudio(true);
    } catch (error) {
      console.error('Erreur lecture audio:', error);
      setAudioError('Erreur lors de la lecture audio');
    }
  };

  const handleSave = async () => {
    if (isSaved || saving) return;
    setSaving(true);
    
    try {
      const savedRecipe = await saveRecipe(recipe);
      if (savedRecipe) {
        setIsSaved(true);
        onSaved?.(savedRecipe);
      }
    } catch (error) {
      console.error('Erreur de sauvegarde:', error);
      alert(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const openImageFullscreen = () => {
    setIsImageFullscreen(true);
  };

  const closeImageFullscreen = () => {
    setIsImageFullscreen(false);
  };

  const openStepIllustration = (step, index) => {
    if (step.illustration) {
      setSelectedStepIllustration({ ...step, index });
    }
  };

  const closeStepIllustration = () => {
    setSelectedStepIllustration(null);
  };

  const handleShare = async () => {
    if (!navigator.share) {
      alert("Le partage n'est pas supporté sur cet appareil");
      return;
    }

    const shareText = `${recipe.title} - créé avec l’app Cuisto`;
    const shareData = {
      title: recipe.title,
      text: shareText,
    };

    if (displayImage) {
      try {
        const response = await fetch(displayImage);
        const blob = await response.blob();
        const fileExtension = blob.type.split('/')[1] || 'jpg';
        const safeTitle = recipe.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const imageFile = new File([blob], `${safeTitle || 'recette'}.${fileExtension}`, {
          type: blob.type || 'image/jpeg',
        });

        if (navigator.canShare?.({ files: [imageFile] })) {
          shareData.files = [imageFile];
        }
      } catch (error) {
        console.error('Erreur lors du partage de l\'image:', error);
      }
    }

    try {
      await navigator.share(shareData);
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('Erreur de partage:', error);
        alert('Impossible de partager la recette.');
      }
    }
  };

  // Gestion du retour avec confirmation si recette non sauvegardée
  const handleBackClick = () => {
    if (!isSaved) {
      setShowExitConfirm(true);
    } else {
      onBack();
    }
  };

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    onBack();
  };

  const handleCancelExit = () => {
    setShowExitConfirm(false);
  };


  // Couleur selon la catégorie
  const getCategoryColor = (category) => {
    switch (category?.toUpperCase()) {
      case 'ENTRÉES':
        return 'var(--color-entrees)';
      case 'PLATS':
        return 'var(--color-plats)';
      case 'DESSERTS':
        return 'var(--color-desserts)';
      default:
        return 'var(--color-accent)';
    }
  };

  // Helper pour obtenir le texte d'une instruction
  const getInstructionText = (instruction) => {
    if (typeof instruction === 'string') return instruction;
    return instruction.text || instruction;
  };

  // Helper pour vérifier si une instruction a une illustration
  const hasIllustration = (instruction) => {
    return typeof instruction === 'object' && instruction.illustration;
  };

  const categoryColor = getCategoryColor(recipe.category);

  return (
    <div className="recipe-view">
      {/* Lightbox pour l'image du plat en plein écran */}
      {isImageFullscreen && displayImage && (
        <div className="image-lightbox" onClick={closeImageFullscreen}>
          <button 
            className="lightbox-close" 
            onClick={closeImageFullscreen}
            aria-label="Fermer"
          >
            <CloseIcon size={28} color="white" />
          </button>
          <img 
            src={displayImage} 
            alt={recipe.title}
            className="lightbox-image"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Lightbox pour l'illustration d'étape */}
      {selectedStepIllustration && (
        <div className="image-lightbox illustration-lightbox" onClick={closeStepIllustration}>
          <button 
            className="lightbox-close" 
            onClick={closeStepIllustration}
            aria-label="Fermer"
          >
            <CloseIcon size={28} color="white" />
          </button>
          <div className="illustration-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="illustration-lightbox-header">
              <span className="illustration-step-badge">Étape {selectedStepIllustration.index + 1}</span>
            </div>
            <img 
              src={selectedStepIllustration.illustration} 
              alt={`Illustration étape ${selectedStepIllustration.index + 1}`}
              className="lightbox-image illustration-image"
            />
          </div>
        </div>
      )}


      {/* Modale de confirmation de sortie */}
      {showExitConfirm && (
        <div className="exit-confirm-overlay" onClick={handleCancelExit}>
          <div className="exit-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="exit-confirm-icon">⚠️</div>
            <h3 className="exit-confirm-title">Attention</h3>
            <p className="exit-confirm-message">
              Cette recette n'a pas encore été sauvegardée. Si vous quittez maintenant, 
              vous perdrez définitivement cette recette générée.
            </p>
            <div className="exit-confirm-actions">
              <button 
                className="btn-secondary exit-confirm-cancel"
                onClick={handleCancelExit}
              >
                Annuler
              </button>
              <button 
                className="btn-primary exit-confirm-confirm"
                onClick={handleConfirmExit}
              >
                Quitter quand même
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header avec navigation */}
      <header className="recipe-header no-print">
        <button className="btn-icon" onClick={handleBackClick} aria-label="Retour">
          <ArrowLeftIcon size={22} />
        </button>
        <div className="header-actions">
          <button 
            className="btn-secondary chef-chat-btn"
            onClick={() => setIsChefChatOpen(true)}
            aria-label="Discuter avec le chef"
          >
            💬 Discuter avec le Chef
          </button>
          {recipe.chefComment && (
            <button
              className={`btn-secondary chef-btn ${isPlayingAudio ? 'playing' : ''}`}
              onClick={handlePlayChefComment}
              disabled={isLoadingAudio}
              aria-label={isPlayingAudio ? 'Mettre en pause' : 'Écouter le commentaire du chef'}
            >
              {isLoadingAudio ? (
                <><span className="btn-spinner"></span> Chargement...</>
              ) : isPlayingAudio ? (
                <>⏸️ Pause</>
              ) : (
                <>👨‍🍳 Écoutez le Chef</>
              )}
            </button>
          )}
          <button
            className="btn-secondary share-btn"
            onClick={handleShare}
            aria-label="Partager la recette"
          >
            📤 Partager
          </button>
          <button
            className="btn-secondary print-btn"
            onClick={handlePrint}
            aria-label="Imprimer la recette"
          >
            🖨️ Imprimer
          </button>
          <button
            className={`btn-icon save-btn ${isSaved ? 'saved' : ''}`}
            onClick={handleSave}
            disabled={isSaved || saving}
            aria-label={isSaved ? 'Recette sauvegardée' : 'Sauvegarder la recette'}
          >
            <BookmarkIcon size={22} filled={isSaved} color={isSaved ? 'var(--color-accent)' : 'currentColor'} />
          </button>
        </div>
      </header>

      {/* Contenu scrollable */}
      <div className="recipe-content">
        {/* Badge catégorie */}
        <div className="category-badge" style={{ backgroundColor: categoryColor }}>
          {recipe.category || 'PLATS'}
        </div>

        {/* Titre */}
        <h1 className="recipe-title">{recipe.title}</h1>

        {/* Erreur audio si présente */}
        {audioError && (
          <p className="chef-audio-error">{audioError}</p>
        )}

        {/* Pictos infos - centrés */}
        <div className="recipe-meta">
          <div className="meta-item">
            <ServingsIcon size={28} color="var(--color-text-light)" />
            <span className="meta-value">{recipe.servings}</span>
          </div>
          <div className="meta-item">
            <PrepTimeIcon size={28} color="var(--color-text-light)" />
            <span className="meta-value">{recipe.prepTime}</span>
          </div>
          {recipe.cookTime && recipe.cookTime !== '0 min' && (
            <div className="meta-item">
              <CookTimeIcon size={28} color="var(--color-text-light)" />
              <span className="meta-value">{recipe.cookTime}</span>
            </div>
          )}
          {recipe.restTime && recipe.restTime !== '0 min' && (
            <div className="meta-item">
              <RestTimeIcon size={28} color="var(--color-text-light)" />
              <span className="meta-value">{recipe.restTime}</span>
            </div>
          )}
        </div>

        {/* Layout deux colonnes */}
        <div className="recipe-layout">
          {/* Colonne gauche: Ingrédients + Instructions */}
          <div className="recipe-column recipe-text-column">
            <section className="ingredients-section">
              <h2 className="section-title">Ingrédients</h2>
              <div className="ingredients-box">
                {recipe.ingredients?.map((section, sectionIndex) => (
                  <div key={sectionIndex} className="ingredient-group">
                    {section.section && (
                      <h3 className="ingredient-group-title">{section.section}</h3>
                    )}
                    <ul className="ingredient-list">
                      {section.items?.map((item, itemIndex) => (
                        <li key={itemIndex} className="ingredient-item">
                          <span className="ingredient-bullet">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* Préparation */}
            <section className="instructions-section">
              <h2 className="section-title">Préparation</h2>
              <ol className="instructions-list">
                {recipe.instructions?.map((step, index) => (
                  <li 
                    key={index} 
                    className={`instruction-item ${hasIllustration(step) ? 'has-illustration' : ''}`}
                  >
                    <span className="instruction-number">{index + 1}</span>
                    <div className="instruction-content">
                      <p className="instruction-text">{getInstructionText(step)}</p>
                      {hasIllustration(step) && (
                        <div 
                          className="instruction-illustration"
                          onClick={() => openStepIllustration(step, index)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && openStepIllustration(step, index)}
                          aria-label={`Agrandir l'illustration de l'étape ${index + 1}`}
                        >
                          <img 
                            src={step.illustration} 
                            alt={`Illustration étape ${index + 1}`}
                            className="step-illustration-image"
                            loading="lazy"
                          />
                          <div className="illustration-zoom-hint">
                            <span>🔍</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          {/* Colonne droite: Image pleine hauteur */}
          <div className="recipe-column recipe-image-column">
            {displayImage && (
              <>
                <div 
                  className="recipe-image-container"
                  onClick={openImageFullscreen}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && openImageFullscreen()}
                  aria-label="Agrandir l'image"
                >
                  <img 
                    src={displayImage} 
                    alt={recipe.title}
                    className="recipe-image"
                  />
                  <div className="image-zoom-hint">
                    <span>🔍</span>
                  </div>
                </div>
                {/* Bouton liste de courses (non imprimé) */}
                <button
                  className="btn-secondary shopping-list-btn no-print"
                  onClick={() => setIsShoppingListOpen(true)}
                  aria-label="Créer ma liste de courses"
                >
                  🛒 Ma liste de courses pour cette recette
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modale liste de courses */}
      <ShoppingListModal
        isOpen={isShoppingListOpen}
        onClose={() => setIsShoppingListOpen(false)}
        recipe={recipe}
      />

      {/* Modale chat avec le chef */}
      <ChefChatModal
        isOpen={isChefChatOpen}
        onClose={() => setIsChefChatOpen(false)}
        recipe={recipe}
      />
    </div>
  );
}
