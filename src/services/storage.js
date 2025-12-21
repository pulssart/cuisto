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
 * Sauvegarde une nouvelle recette
 * @param {Object} recipe 
 * @returns {Object} La recette avec son ID
 */
export function saveRecipe(recipe) {
  try {
    const recipes = getSavedRecipes();
    const newRecipe = {
      ...recipe,
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
    };
    recipes.unshift(newRecipe);
    localStorage.setItem(KEYS.RECIPES, JSON.stringify(recipes));
    return newRecipe;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la recette:', error);
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

