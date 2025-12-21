import { useState } from 'react';
import { 
  ServingsIcon, 
  PrepTimeIcon, 
  CookTimeIcon, 
  RestTimeIcon,
  BookmarkIcon,
  ArrowLeftIcon 
} from './icons';
import { saveRecipe } from '../services/storage';
import './RecipeView.css';

export default function RecipeView({ recipe, onBack, onSaved }) {
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const categoryColor = getCategoryColor(recipe.category);

  return (
    <div className="recipe-view">
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
                  <li key={index} className="instruction-item">
                    <span className="instruction-number">{index + 1}</span>
                    <p className="instruction-text">{step}</p>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          {/* Colonne droite: Image pleine hauteur */}
          <div className="recipe-column recipe-image-column">
            {recipe.image && (
              <div className="recipe-image-container">
                <img 
                  src={recipe.image} 
                  alt={recipe.title}
                  className="recipe-image"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
