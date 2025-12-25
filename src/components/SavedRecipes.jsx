import { useState, useEffect } from 'react';
import { ArrowLeftIcon, TrashIcon } from './icons';
import { getSavedRecipesAsync, deleteRecipe, getRecipeById, getStorageUsage, formatStorageSize } from '../services/storage';
import './SavedRecipes.css';

export default function SavedRecipes({ onBack, onSelectRecipe }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [loadingRecipeId, setLoadingRecipeId] = useState(null);
  const [storageInfo, setStorageInfo] = useState(null);

  // Charger les recettes et les infos de stockage au montage
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [savedRecipes, storage] = await Promise.all([
          getSavedRecipesAsync(),
          getStorageUsage()
        ]);
        setRecipes(savedRecipes);
        setStorageInfo(storage);
      } catch (error) {
        console.error('Erreur chargement recettes:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const handleDelete = async (e, recipeId) => {
    e.stopPropagation();
    setDeletingId(recipeId);
    
    // Animation de suppression
    setTimeout(async () => {
      await deleteRecipe(recipeId);
      setRecipes(recipes.filter(r => r.id !== recipeId));
      setDeletingId(null);
    }, 300);
  };

  // Charger la recette complète avec images HD quand on clique
  const handleSelectRecipe = async (recipe) => {
    setLoadingRecipeId(recipe.id);
    
    try {
      // Récupérer la recette complète avec images HD et illustrations
      const fullRecipe = await getRecipeById(recipe.id);
      
      if (fullRecipe) {
        onSelectRecipe(fullRecipe);
      } else {
        // Fallback: utiliser les données de la liste
        onSelectRecipe(recipe);
      }
    } catch (error) {
      console.error('Erreur chargement recette complète:', error);
      onSelectRecipe(recipe);
    } finally {
      setLoadingRecipeId(null);
    }
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

  // Grouper les recettes par catégorie
  const groupRecipesByCategory = (recipes) => {
    const grouped = {};
    
    recipes.forEach(recipe => {
      const category = recipe.category?.toUpperCase() || 'PLATS';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(recipe);
    });
    
    // Trier chaque groupe par date (plus récent en premier)
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    });
    
    // Ordre d'affichage des catégories
    const categoryOrder = ['ENTRÉES', 'PLATS', 'DESSERTS'];
    const sortedCategories = [
      ...categoryOrder.filter(cat => grouped[cat]),
      ...Object.keys(grouped).filter(cat => !categoryOrder.includes(cat))
    ];
    
    return { grouped, sortedCategories };
  };

  // Labels des catégories
  const getCategoryLabel = (category) => {
    switch (category?.toUpperCase()) {
      case 'ENTRÉES':
        return 'Entrées';
      case 'PLATS':
        return 'Plats';
      case 'DESSERTS':
        return 'Desserts';
      default:
        return category || 'Plats';
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

      {/* Indicateur de stockage */}
      {storageInfo && recipes.length > 0 && (
        <div className="storage-indicator">
          <div className="storage-bar">
            <div 
              className="storage-bar-fill" 
              style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
            />
          </div>
          <span className="storage-text">
            {formatStorageSize(storageInfo.used)} utilisés
            {storageInfo.percentage > 80 && ' ⚠️'}
          </span>
        </div>
      )}

      {/* Contenu */}
      <div className="saved-content">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Chargement des recettes...</p>
          </div>
        ) : recipes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📖</div>
            <h2>Aucune recette sauvegardée</h2>
            <p>Les recettes que vous sauvegarderez apparaîtront ici.</p>
            <button className="btn-secondary" onClick={onBack}>
              Créer une recette
            </button>
          </div>
        ) : (() => {
          const { grouped, sortedCategories } = groupRecipesByCategory(recipes);
          
          return (
            <div className="recipes-by-category">
              {sortedCategories.map((category) => (
                <section key={category} className="category-section">
                  <h2 
                    className="category-title"
                    style={{ 
                      color: getCategoryColor(category),
                      borderLeftColor: getCategoryColor(category)
                    }}
                  >
                    {getCategoryLabel(category)}
                    <span className="category-count">({grouped[category].length})</span>
                  </h2>
                  <div className="recipes-grid">
                    {grouped[category].map((recipe) => (
                      <article
                        key={recipe.id}
                        className={`recipe-card ${deletingId === recipe.id ? 'deleting' : ''} ${loadingRecipeId === recipe.id ? 'loading' : ''}`}
                        onClick={() => handleSelectRecipe(recipe)}
                      >
                        {/* Overlay de chargement */}
                        {loadingRecipeId === recipe.id && (
                          <div className="card-loading-overlay">
                            <div className="card-spinner"></div>
                          </div>
                        )}

                        {/* Image (thumbnail pour les nouvelles recettes, image pour la rétrocompatibilité) */}
                        <div className="card-image-container">
                          {(recipe.thumbnail || recipe.image) ? (
                            <img
                              src={recipe.thumbnail || recipe.image}
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
                </section>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
