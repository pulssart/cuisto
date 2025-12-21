import { useState, useEffect } from 'react';
import { ArrowLeftIcon, TrashIcon } from './icons';
import { getSavedRecipes, deleteRecipe } from '../services/storage';
import './SavedRecipes.css';

export default function SavedRecipes({ onBack, onSelectRecipe }) {
  const [recipes, setRecipes] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    setRecipes(getSavedRecipes());
  }, []);

  const handleDelete = (e, recipeId) => {
    e.stopPropagation();
    setDeletingId(recipeId);
    
    setTimeout(() => {
      deleteRecipe(recipeId);
      setRecipes(recipes.filter(r => r.id !== recipeId));
      setDeletingId(null);
    }, 300);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
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

  return (
    <div className="saved-recipes">
      {/* Header */}
      <header className="saved-header">
        <button className="btn-icon" onClick={onBack} aria-label="Retour">
          <ArrowLeftIcon size={22} />
        </button>
        <h1 className="saved-title">Mes Recettes</h1>
        <div className="header-spacer"></div>
      </header>

      {/* Contenu */}
      <div className="saved-content">
        {recipes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📖</div>
            <h2>Aucune recette sauvegardée</h2>
            <p>Les recettes que vous sauvegarderez apparaîtront ici.</p>
            <button className="btn-secondary" onClick={onBack}>
              Créer une recette
            </button>
          </div>
        ) : (
          <div className="recipes-grid">
            {recipes.map((recipe) => (
              <article
                key={recipe.id}
                className={`recipe-card ${deletingId === recipe.id ? 'deleting' : ''}`}
                onClick={() => onSelectRecipe(recipe)}
              >
                {/* Image */}
                <div className="card-image-container">
                  {recipe.image ? (
                    <img
                      src={recipe.image}
                      alt={recipe.title}
                      className="card-image"
                      loading="lazy"
                    />
                  ) : (
                    <div className="card-image-placeholder">
                      <span>🍽</span>
                    </div>
                  )}
                  {/* Badge catégorie */}
                  <span 
                    className="card-category"
                    style={{ backgroundColor: getCategoryColor(recipe.category) }}
                  >
                    {recipe.category || 'PLATS'}
                  </span>
                </div>

                {/* Infos */}
                <div className="card-info">
                  <h3 className="card-title">{recipe.title}</h3>
                  <div className="card-meta">
                    <span className="card-time">⏱ {recipe.prepTime}</span>
                    <span className="card-date">{formatDate(recipe.savedAt)}</span>
                  </div>
                </div>

                {/* Bouton supprimer */}
                <button
                  className="card-delete-btn"
                  onClick={(e) => handleDelete(e, recipe.id)}
                  aria-label="Supprimer la recette"
                >
                  <TrashIcon size={18} />
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

