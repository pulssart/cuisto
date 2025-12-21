/**
 * Service de stockage localStorage pour Cuisto
 */

const KEYS = {
  API_KEY: 'cuisto_api_key',
  RECIPES: 'cuisto_saved_recipes',
};

// Limite de taille pour les images (100 Ko en base64)
const MAX_IMAGE_SIZE = 100 * 1024;
// Nombre max de recettes à garder
const MAX_RECIPES = 20;

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
 * Compresse une image base64 en réduisant sa qualité
 * @param {string} base64 - Image en base64
 * @param {number} maxSize - Taille max en caractères
 * @returns {Promise<string|null>}
 */
async function compressImage(base64, maxSize = MAX_IMAGE_SIZE) {
  return new Promise((resolve) => {
    // Si pas d'image ou déjà assez petite
    if (!base64 || base64.length <= maxSize) {
      resolve(base64);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      
      // Réduire la taille de l'image proportionnellement
      let { width, height } = img;
      const maxDimension = 400; // Taille max pour le stockage
      
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // Compresser en JPEG avec qualité réduite
      const compressed = canvas.toDataURL('image/jpeg', 0.6);
      
      // Si toujours trop grand, on abandonne l'image
      if (compressed.length > maxSize * 2) {
        resolve(null);
      } else {
        resolve(compressed);
      }
    };
    
    img.onerror = () => resolve(null);
    img.src = base64;
  });
}

/**
 * Prépare une recette pour la sauvegarde (optimise les données)
 * On crée un thumbnail basse définition et on supprime la photo HD et les illustrations
 * @param {Object} recipe 
 * @returns {Promise<Object>}
 */
async function prepareRecipeForStorage(recipe) {
  // Créer une copie pour ne pas modifier l'original
  const prepared = { ...recipe };
  
  // Créer un thumbnail basse définition de l'image principale
  if (prepared.image) {
    prepared.thumbnail = await compressImage(prepared.image);
    // Supprimer l'image HD - on ne garde que le thumbnail
    delete prepared.image;
  }
  
  // Supprimer les illustrations des étapes pour économiser de l'espace
  // On ne garde que le texte de chaque étape
  if (prepared.instructions) {
    prepared.instructions = prepared.instructions.map(instruction => {
      if (typeof instruction === 'object') {
        return {
          text: instruction.text,
          // On ne sauvegarde pas les illustrations ni les prompts
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
 * Essaie de sauvegarder les recettes, avec gestion du quota
 * @param {Array} recipes 
 * @returns {boolean}
 */
function trySaveRecipes(recipes) {
  try {
    localStorage.setItem(KEYS.RECIPES, JSON.stringify(recipes));
    return true;
  } catch (storageError) {
    // Si erreur de quota
    if (storageError.name === 'QuotaExceededError' || 
        storageError.code === 22 || 
        storageError.code === 1014) {
      return false;
    }
    throw storageError;
  }
}

/**
 * Sauvegarde une nouvelle recette
 * @param {Object} recipe 
 * @returns {Promise<Object>} La recette avec son ID
 */
export async function saveRecipe(recipe) {
  try {
    let recipes = getSavedRecipes();
    const preparedRecipe = await prepareRecipeForStorage(recipe);
    
    const newRecipe = {
      ...preparedRecipe,
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
    };
    
    recipes.unshift(newRecipe);
    
    // Limiter le nombre de recettes
    if (recipes.length > MAX_RECIPES) {
      recipes = recipes.slice(0, MAX_RECIPES);
    }
    
    // Essayer de sauvegarder
    if (!trySaveRecipes(recipes)) {
      console.warn('Quota localStorage dépassé, optimisation en cours...');
      
      // Stratégie 1: Supprimer les images des anciennes recettes
      recipes = recipes.map((r, index) => {
        if (index > 0) {
          return { ...r, image: null };
        }
        return r;
      });
      
      if (!trySaveRecipes(recipes)) {
        // Stratégie 2: Supprimer l'image de la nouvelle recette aussi
        recipes[0] = { ...recipes[0], image: null };
        
        if (!trySaveRecipes(recipes)) {
          // Stratégie 3: Garder seulement les 5 dernières recettes sans images
          recipes = recipes.slice(0, 5).map(r => ({ ...r, image: null }));
          
          if (!trySaveRecipes(recipes)) {
            throw new Error('Impossible de sauvegarder, stockage plein');
          }
        }
      }
      
      console.info('Sauvegarde réussie après optimisation');
    }
    
    return newRecipe;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la recette:', error);
    throw new Error('Erreur lors de la sauvegarde. Essayez de supprimer d\'anciennes recettes.');
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
