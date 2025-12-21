/**
 * Service de stockage localStorage pour Cuisto
 */

const KEYS = {
  API_KEY: 'cuisto_api_key',
  RECIPES: 'cuisto_saved_recipes',
};

/**
 * Sauvegarde la clé API OpenAI
 * @param {string} apiKey 
 */
export function saveApiKey(apiKey) {
  try {
    localStorage.setItem(KEYS.API_KEY, apiKey);
    return true;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la clé API:', error);
    return false;
  }
}

/**
 * Récupère la clé API OpenAI
 * @returns {string|null}
 */
export function getApiKey() {
  try {
    return localStorage.getItem(KEYS.API_KEY);
  } catch (error) {
    console.error('Erreur lors de la récupération de la clé API:', error);
    return null;
  }
}

/**
 * Supprime la clé API
 */
export function removeApiKey() {
  try {
    localStorage.removeItem(KEYS.API_KEY);
    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression de la clé API:', error);
    return false;
  }
}

/**
 * Récupère toutes les recettes sauvegardées
 * @returns {Array}
 */
export function getSavedRecipes() {
  try {
    const recipes = localStorage.getItem(KEYS.RECIPES);
    return recipes ? JSON.parse(recipes) : [];
  } catch (error) {
    console.error('Erreur lors de la récupération des recettes:', error);
    return [];
  }
}

/**
 * Prépare une recette pour la sauvegarde (optimise les données)
 * @param {Object} recipe 
 * @returns {Object}
 */
function prepareRecipeForStorage(recipe) {
  // Créer une copie pour ne pas modifier l'original
  const prepared = { ...recipe };
  
  // Garder l'image principale (elle est importante)
  // Mais supprimer les illustrations des étapes pour économiser de l'espace
  if (prepared.instructions) {
    prepared.instructions = prepared.instructions.map(instruction => {
      if (typeof instruction === 'object') {
        return {
          text: instruction.text,
          // On ne sauvegarde pas les illustrations pour économiser de l'espace
          illustrationPrompt: instruction.illustrationPrompt,
        };
      }
      return instruction;
    });
  }
  
  // Supprimer les prompts qui ne sont plus nécessaires
  delete prepared.imagePrompt;
  
  return prepared;
}

/**
 * Sauvegarde une nouvelle recette
 * @param {Object} recipe 
 * @returns {Object} La recette avec son ID
 */
export function saveRecipe(recipe) {
  try {
    const recipes = getSavedRecipes();
    const preparedRecipe = prepareRecipeForStorage(recipe);
    
    const newRecipe = {
      ...preparedRecipe,
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
    };
    
    recipes.unshift(newRecipe);
    
    // Essayer de sauvegarder
    try {
      localStorage.setItem(KEYS.RECIPES, JSON.stringify(recipes));
    } catch (storageError) {
      // Si erreur de quota, essayer de supprimer les anciennes recettes
      if (storageError.name === 'QuotaExceededError' || 
          storageError.code === 22 || 
          storageError.code === 1014) {
        console.warn('Quota localStorage dépassé, suppression des anciennes recettes...');
        
        // Garder seulement les 10 dernières recettes
        const trimmedRecipes = recipes.slice(0, 10);
        localStorage.setItem(KEYS.RECIPES, JSON.stringify(trimmedRecipes));
      } else {
        throw storageError;
      }
    }
    
    return newRecipe;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la recette:', error);
    alert('Erreur lors de la sauvegarde. L\'espace de stockage est peut-être plein.');
    return null;
  }
}

/**
 * Supprime une recette par son ID
 * @param {string} recipeId 
 * @returns {boolean}
 */
export function deleteRecipe(recipeId) {
  try {
    const recipes = getSavedRecipes();
    const filteredRecipes = recipes.filter(r => r.id !== recipeId);
    localStorage.setItem(KEYS.RECIPES, JSON.stringify(filteredRecipes));
    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression de la recette:', error);
    return false;
  }
}

/**
 * Récupère une recette par son ID
 * @param {string} recipeId 
 * @returns {Object|null}
 */
export function getRecipeById(recipeId) {
  try {
    const recipes = getSavedRecipes();
    return recipes.find(r => r.id === recipeId) || null;
  } catch (error) {
    console.error('Erreur lors de la récupération de la recette:', error);
    return null;
  }
}

/**
 * Vérifie si une clé API est configurée
 * @returns {boolean}
 */
export function hasApiKey() {
  const key = getApiKey();
  return key !== null && key.trim().length > 0;
}

/**
 * Vide toutes les recettes sauvegardées
 * @returns {boolean}
 */
export function clearAllRecipes() {
  try {
    localStorage.removeItem(KEYS.RECIPES);
    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression des recettes:', error);
    return false;
  }
}
