import { useState, useEffect } from 'react';
import { CloseIcon } from './icons';
import { extractShoppingList } from '../services/openai';
import './ShoppingListModal.css';

export default function ShoppingListModal({ isOpen, onClose, recipe }) {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checkedItems, setCheckedItems] = useState(new Set());

  // Réinitialiser quand la modale s'ouvre
  useEffect(() => {
    if (isOpen && recipe) {
      setCheckedItems(new Set());
      
      // Utiliser la liste de courses pré-générée si disponible, sinon l'extraire
      if (recipe.shoppingList && Array.isArray(recipe.shoppingList) && recipe.shoppingList.length > 0) {
        setIngredients(recipe.shoppingList);
        setLoading(false);
        setError(null);
      } else {
        // Fallback pour les anciennes recettes : extraire à la volée
        setLoading(true);
        setError(null);
        
        try {
          const extracted = extractShoppingList(recipe);
          setIngredients(extracted);
        } catch (err) {
          console.error('Erreur extraction:', err);
          setError(err.message || 'Erreur lors de l\'extraction des ingrédients');
        } finally {
          setLoading(false);
        }
      }
    }
  }, [isOpen, recipe]);

  const handleToggleItem = (index) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedItems(newChecked);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCheckAll = () => {
    if (checkedItems.size === ingredients.length) {
      setCheckedItems(new Set());
    } else {
      setCheckedItems(new Set(ingredients.map((_, i) => i)));
    }
  };

  // Grouper par catégorie
  const groupedIngredients = ingredients.reduce((acc, item, index) => {
    const category = item.category || 'AUTRES';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({ ...item, index });
    return acc;
  }, {});

  const categoryLabels = {
    FRUITS_LEGUMES: '🍎 Fruits & Légumes',
    VIANDES_POISSONS: '🥩 Viandes & Poissons',
    EPICERIE: '🥫 Épicerie',
    PRODUITS_LAITIERS: '🥛 Produits Laitiers',
    BOULANGERIE: '🥖 Boulangerie',
    AUTRES: '📦 Autres',
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay shopping-list-overlay" onClick={onClose}>
      <div className="modal-content shopping-list-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🛒 Ma liste de courses</h2>
          <button className="btn-icon modal-close" onClick={onClose} aria-label="Fermer">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="modal-body shopping-list-body">
          {loading ? (
            <div className="shopping-list-loading">
              <div className="spinner"></div>
              <p>Extraction des ingrédients...</p>
            </div>
          ) : error ? (
            <div className="shopping-list-error">
              <p>⚠️ {error}</p>
              <button className="btn-secondary" onClick={onClose}>
                Fermer
              </button>
            </div>
          ) : ingredients.length === 0 ? (
            <div className="shopping-list-empty">
              <p>Aucun ingrédient trouvé</p>
            </div>
          ) : (
            <>
              <div className="shopping-list-actions">
                <button 
                  className="btn-secondary"
                  onClick={handleCheckAll}
                >
                  {checkedItems.size === ingredients.length ? 'Tout décocher' : 'Tout cocher'}
                </button>
                <button 
                  className="btn-primary"
                  onClick={handlePrint}
                >
                  🖨️ Imprimer
                </button>
              </div>

              <div className="shopping-list-content">
                {Object.entries(groupedIngredients).map(([category, items]) => (
                  <div key={category} className="shopping-category">
                    <h3 className="category-title">{categoryLabels[category] || category}</h3>
                    <ul className="shopping-items">
                      {items.map((item) => {
                        const isChecked = checkedItems.has(item.index);
                        return (
                          <li 
                            key={item.index}
                            className={`shopping-item ${isChecked ? 'checked' : ''}`}
                          >
                            <label className="shopping-item-label">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleItem(item.index)}
                                className="shopping-checkbox"
                              />
                              <span className="shopping-item-quantity">{item.quantity}</span>
                              <span className="shopping-item-name">{item.name}</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

