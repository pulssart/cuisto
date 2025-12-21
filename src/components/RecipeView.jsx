import { useState, useEffect } from 'react';
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
import './RecipeView.css';

export default function RecipeView({ recipe, onBack, onSaved }) {
  // Vérifie si la recette a déjà un ID (= déjà sauvegardée)
  const [isSaved, setIsSaved] = useState(!!recipe.id);
  const [saving, setSaving] = useState(false);
  const [isImageFullscreen, setIsImageFullscreen] = useState(false);
  const [selectedStepIllustration, setSelectedStepIllustration] = useState(null);

  // Réinitialise l'état quand la recette change
  useEffect(() => {
    setIsSaved(!!recipe.id);
    setIsImageFullscreen(false);
    setSelectedStepIllustration(null);
  }, [recipe]);

  const handleSave = () => {
    if (isSaved || saving) return;
    setSaving(true);
    
    const savedRecipe = saveRecipe(recipe);
    if (savedRecipe) {
      setIsSaved(true);
      onSaved?.(savedRecipe);
    }
    setSaving(false);
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
      {isImageFullscreen && recipe.image && (
        <div className="image-lightbox" onClick={closeImageFullscreen}>
          <button 
            className="lightbox-close" 
            onClick={closeImageFullscreen}
            aria-label="Fermer"
          >
            <CloseIcon size={28} color="white" />
          </button>
          <img 
            src={recipe.image} 
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

      {/* Header avec navigation */}
      <header className="recipe-header no-print">
        <button className="btn-icon" onClick={onBack} aria-label="Retour">
          <ArrowLeftIcon size={22} />
        </button>
        <div className="header-actions">
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
                    onClick={() => hasIllustration(step) && openStepIllustration(step, index)}
                    role={hasIllustration(step) ? 'button' : undefined}
                    tabIndex={hasIllustration(step) ? 0 : undefined}
                    onKeyDown={(e) => e.key === 'Enter' && hasIllustration(step) && openStepIllustration(step, index)}
                  >
                    <span className="instruction-number">{index + 1}</span>
                    <div className="instruction-content">
                      <p className="instruction-text">{getInstructionText(step)}</p>
                      {hasIllustration(step) && (
                        <span className="illustration-hint">✏️ Voir l'illustration</span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          {/* Colonne droite: Image pleine hauteur */}
          <div className="recipe-column recipe-image-column">
            {recipe.image && (
              <div 
                className="recipe-image-container"
                onClick={openImageFullscreen}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && openImageFullscreen()}
                aria-label="Agrandir l'image"
              >
                <img 
                  src={recipe.image} 
                  alt={recipe.title}
                  className="recipe-image"
                />
                <div className="image-zoom-hint">
                  <span>🔍</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
