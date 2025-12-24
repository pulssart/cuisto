/**
 * Service de stockage IndexedDB pour Cuisto
 * Remplace localStorage pour permettre le stockage d'images en haute définition
 * 
 * Capacité : 50-100+ MB (vs 5-10 MB avec localStorage)
 * Avantages : Images HD, illustrations conservées, plus de recettes
 */

const DB_NAME = 'cuisto_db';
const DB_VERSION = 1;
const STORES = {
  RECIPES: 'recipes',
  SETTINGS: 'settings',
};

// Clé legacy localStorage pour migration
const LEGACY_KEYS = {
  API_KEY: 'cuisto_api_key',
  RECIPES: 'cuisto_saved_recipes',
};

let dbInstance = null;
let dbReady = false;
let dbReadyPromise = null;

/**
 * Ouvre la connexion à IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  if (dbInstance && dbReady) {
    return Promise.resolve(dbInstance);
  }

  if (dbReadyPromise) {
    return dbReadyPromise;
  }

  dbReadyPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Erreur ouverture IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      dbReady = true;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Store pour les recettes
      if (!db.objectStoreNames.contains(STORES.RECIPES)) {
        const recipesStore = db.createObjectStore(STORES.RECIPES, { keyPath: 'id' });
        recipesStore.createIndex('savedAt', 'savedAt', { unique: false });
        recipesStore.createIndex('category', 'category', { unique: false });
      }

      // Store pour les paramètres (clé API, etc.)
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
    };
  });

  return dbReadyPromise;
}

/**
 * Convertit une chaîne base64 en Blob (stockage plus efficace)
 * @param {string} base64 - Image en base64
 * @returns {Blob|null}
 */
function base64ToBlob(base64) {
  if (!base64 || !base64.startsWith('data:')) return null;
  
  try {
    const parts = base64.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    if (!mimeMatch) return null;
    
    const mime = mimeMatch[1];
    const binary = atob(parts[1]);
    const array = new Uint8Array(binary.length);
    
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    
    return new Blob([array], { type: mime });
  } catch (error) {
    console.error('Erreur conversion base64 vers Blob:', error);
    return null;
  }
}

/**
 * Convertit un Blob en chaîne base64 (pour affichage)
 * @param {Blob} blob 
 * @returns {Promise<string|null>}
 */
function blobToBase64(blob) {
  if (!blob) return Promise.resolve(null);
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

/**
 * Compresse une image en JPEG pour optimiser le stockage
 * @param {string} base64 - Image source en base64
 * @param {number} quality - Qualité JPEG (0-1)
 * @returns {Promise<string|null>}
 */
async function compressImage(base64, quality = 0.85) {
  if (!base64) return null;
  
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      // Compresser en JPEG
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    
    img.onerror = () => resolve(base64); // Fallback: retourner l'original
    img.src = base64;
  });
}

/**
 * Crée un thumbnail d'une image pour la liste des recettes
 * @param {string} base64 - Image source en base64
 * @param {number} maxSize - Taille max en pixels
 * @returns {Promise<string|null>}
 */
async function createThumbnail(base64, maxSize = 200) {
  if (!base64) return null;
  
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      
      // Redimensionner proportionnellement
      if (width > height) {
        if (width > maxSize) {
          height = (height / width) * maxSize;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width / height) * maxSize;
          height = maxSize;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // JPEG avec qualité moyenne pour le thumbnail
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    
    img.onerror = () => resolve(null);
    img.src = base64;
  });
}

// ============================================
// API KEY (Settings)
// ============================================

/**
 * Migre la clé API de localStorage vers IndexedDB si nécessaire
 */
async function migrateApiKey() {
  try {
    const legacyKey = localStorage.getItem(LEGACY_KEYS.API_KEY);
    if (legacyKey) {
      await saveApiKey(legacyKey);
      // On garde la clé dans localStorage aussi pour compatibilité
      // localStorage.removeItem(LEGACY_KEYS.API_KEY);
      console.info('Clé API migrée vers IndexedDB');
    }
  } catch (error) {
    console.error('Erreur migration clé API:', error);
  }
}

/**
 * Sauvegarde la clé API OpenAI
 * @param {string} apiKey 
 * @returns {Promise<boolean>}
 */
export async function saveApiKey(apiKey) {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SETTINGS, 'readwrite');
      const store = tx.objectStore(STORES.SETTINGS);
      
      const request = store.put({ key: 'apiKey', value: apiKey });
      
      request.onsuccess = () => {
        // Garde aussi dans localStorage pour compatibilité avec openai.js
        localStorage.setItem(LEGACY_KEYS.API_KEY, apiKey);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erreur sauvegarde clé API:', error);
    // Fallback localStorage
    localStorage.setItem(LEGACY_KEYS.API_KEY, apiKey);
    return true;
  }
}

/**
 * Récupère la clé API OpenAI
 * @returns {Promise<string|null>}
 */
export async function getApiKeyAsync() {
  try {
    const db = await openDB();
    
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.SETTINGS, 'readonly');
      const store = tx.objectStore(STORES.SETTINGS);
      const request = store.get('apiKey');
      
      request.onsuccess = () => {
        const result = request.result;
        resolve(result?.value || null);
      };
      request.onerror = () => resolve(null);
    });
  } catch (error) {
    console.error('Erreur récupération clé API:', error);
    return null;
  }
}

/**
 * Récupère la clé API (version synchrone pour compatibilité)
 * Utilise localStorage comme cache synchrone
 * @returns {string|null}
 */
export function getApiKey() {
  return localStorage.getItem(LEGACY_KEYS.API_KEY);
}

/**
 * Supprime la clé API
 * @returns {Promise<boolean>}
 */
export async function removeApiKey() {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SETTINGS, 'readwrite');
      const store = tx.objectStore(STORES.SETTINGS);
      const request = store.delete('apiKey');
      
      request.onsuccess = () => {
        localStorage.removeItem(LEGACY_KEYS.API_KEY);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erreur suppression clé API:', error);
    localStorage.removeItem(LEGACY_KEYS.API_KEY);
    return true;
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

// ============================================
// RECIPES
// ============================================

/**
 * Migre les recettes de localStorage vers IndexedDB
 */
async function migrateRecipes() {
  try {
    const legacyRecipes = localStorage.getItem(LEGACY_KEYS.RECIPES);
    if (!legacyRecipes) return;
    
    const recipes = JSON.parse(legacyRecipes);
    if (!Array.isArray(recipes) || recipes.length === 0) return;
    
    const db = await openDB();
    
    for (const recipe of recipes) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.RECIPES, 'readwrite');
        const store = tx.objectStore(STORES.RECIPES);
        
        // Convertir les images si présentes
        const recipeToSave = {
          ...recipe,
          id: recipe.id || crypto.randomUUID(),
          savedAt: recipe.savedAt || new Date().toISOString(),
          // Garder le thumbnail existant
          thumbnailBlob: recipe.thumbnail ? base64ToBlob(recipe.thumbnail) : null,
          // Les anciennes recettes n'ont pas d'image HD ni d'illustrations
          imageBlob: null,
          instructionsData: recipe.instructions?.map(inst => ({
            text: typeof inst === 'string' ? inst : inst.text,
            illustrationBlob: null,
          })) || [],
        };
        
        // Nettoyer les propriétés legacy
        delete recipeToSave.thumbnail;
        delete recipeToSave.image;
        delete recipeToSave.instructions;
        delete recipeToSave.imagePrompt;
        
        const request = store.put(recipeToSave);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
    
    // Supprimer les anciennes données
    localStorage.removeItem(LEGACY_KEYS.RECIPES);
    console.info(`${recipes.length} recettes migrées vers IndexedDB`);
  } catch (error) {
    console.error('Erreur migration recettes:', error);
  }
}

/**
 * Sauvegarde une nouvelle recette avec images en HD
 * Les images sont compressées en JPEG pour optimiser le stockage
 * @param {Object} recipe - La recette complète avec images base64
 * @returns {Promise<Object>} La recette sauvegardée avec son ID
 */
export async function saveRecipe(recipe) {
  try {
    const db = await openDB();
    const id = recipe.id || crypto.randomUUID();
    
    // Compresser l'image principale en JPEG HD (qualité 85%)
    const compressedImage = await compressImage(recipe.image, 0.85);
    
    // Créer le thumbnail pour la liste
    const thumbnail = await createThumbnail(compressedImage);
    
    // Compresser les illustrations (qualité 80% car moins critique)
    const compressedInstructions = await Promise.all(
      (recipe.instructions || []).map(async (inst) => {
        const text = typeof inst === 'string' ? inst : inst.text;
        const illustration = typeof inst === 'object' ? inst.illustration : null;
        const compressedIllustration = illustration 
          ? await compressImage(illustration, 0.80)
          : null;
        
        return {
          text,
          illustrationBlob: base64ToBlob(compressedIllustration),
        };
      })
    );
    
    // Préparer la recette pour le stockage
    const recipeToSave = {
      // Métadonnées
      id,
      title: recipe.title,
      category: recipe.category,
      servings: recipe.servings,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      restTime: recipe.restTime,
      chefComment: recipe.chefComment,
      ingredients: recipe.ingredients,
      generatedAt: recipe.generatedAt,
      savedAt: new Date().toISOString(),
      
      // Image principale en Blob (HD compressée)
      imageBlob: base64ToBlob(compressedImage),
      
      // Thumbnail pour la liste (petit, en Blob)
      thumbnailBlob: base64ToBlob(thumbnail),
      
      // Instructions avec illustrations compressées en Blob
      instructionsData: compressedInstructions,
    };
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.RECIPES, 'readwrite');
      const store = tx.objectStore(STORES.RECIPES);
      const request = store.put(recipeToSave);
      
      request.onsuccess = () => {
        console.info('Recette sauvegardée avec images HD (compressées JPEG)');
        resolve({
          ...recipe,
          id,
          savedAt: recipeToSave.savedAt,
        });
      };
      
      request.onerror = () => {
        console.error('Erreur sauvegarde recette:', request.error);
        reject(new Error('Erreur lors de la sauvegarde'));
      };
    });
  } catch (error) {
    console.error('Erreur sauvegarde recette:', error);
    throw new Error('Erreur lors de la sauvegarde de la recette');
  }
}

/**
 * Récupère toutes les recettes (avec thumbnails pour la liste)
 * @returns {Promise<Array>}
 */
export async function getSavedRecipesAsync() {
  try {
    const db = await openDB();
    
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.RECIPES, 'readonly');
      const store = tx.objectStore(STORES.RECIPES);
      const request = store.getAll();
      
      request.onsuccess = async () => {
        const recipes = request.result || [];
        
        // Convertir les thumbnails pour l'affichage
        const results = await Promise.all(
          recipes.map(async (recipe) => ({
            id: recipe.id,
            title: recipe.title,
            category: recipe.category,
            servings: recipe.servings,
            prepTime: recipe.prepTime,
            cookTime: recipe.cookTime,
            savedAt: recipe.savedAt,
            // Thumbnail pour la liste
            thumbnail: await blobToBase64(recipe.thumbnailBlob),
          }))
        );
        
        // Trier par date de sauvegarde (plus récent en premier)
        results.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
        
        resolve(results);
      };
      
      request.onerror = () => {
        console.error('Erreur récupération recettes:', request.error);
        resolve([]);
      };
    });
  } catch (error) {
    console.error('Erreur récupération recettes:', error);
    return [];
  }
}

/**
 * Récupère les recettes (version synchrone pour compatibilité)
 * Retourne un tableau vide et charge en async
 * @returns {Array}
 */
export function getSavedRecipes() {
  // Pour la compatibilité, on retourne les données du cache
  // Le composant devra utiliser getSavedRecipesAsync pour les vraies données
  return [];
}

/**
 * Récupère une recette complète par son ID (avec images HD)
 * @param {string} recipeId 
 * @returns {Promise<Object|null>}
 */
export async function getRecipeById(recipeId) {
  try {
    const db = await openDB();
    
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.RECIPES, 'readonly');
      const store = tx.objectStore(STORES.RECIPES);
      const request = store.get(recipeId);
      
      request.onsuccess = async () => {
        const recipe = request.result;
        if (!recipe) {
          resolve(null);
          return;
        }
        
        // Reconstruire la recette avec les images en base64
        const result = {
          id: recipe.id,
          title: recipe.title,
          category: recipe.category,
          servings: recipe.servings,
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          restTime: recipe.restTime,
          chefComment: recipe.chefComment,
          ingredients: recipe.ingredients,
          generatedAt: recipe.generatedAt,
          savedAt: recipe.savedAt,
          
          // Image HD
          image: await blobToBase64(recipe.imageBlob),
          
          // Thumbnail (fallback si pas d'image HD)
          thumbnail: await blobToBase64(recipe.thumbnailBlob),
          
          // Instructions avec illustrations
          instructions: await Promise.all(
            (recipe.instructionsData || []).map(async (inst) => ({
              text: inst.text,
              illustration: await blobToBase64(inst.illustrationBlob),
            }))
          ),
        };
        
        resolve(result);
      };
      
      request.onerror = () => {
        console.error('Erreur récupération recette:', request.error);
        resolve(null);
      };
    });
  } catch (error) {
    console.error('Erreur récupération recette:', error);
    return null;
  }
}

/**
 * Supprime une recette par son ID
 * @param {string} recipeId 
 * @returns {Promise<boolean>}
 */
export async function deleteRecipe(recipeId) {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.RECIPES, 'readwrite');
      const store = tx.objectStore(STORES.RECIPES);
      const request = store.delete(recipeId);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erreur suppression recette:', error);
    return false;
  }
}

/**
 * Vide toutes les recettes sauvegardées
 * @returns {Promise<boolean>}
 */
export async function clearAllRecipes() {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.RECIPES, 'readwrite');
      const store = tx.objectStore(STORES.RECIPES);
      const request = store.clear();
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erreur suppression recettes:', error);
    return false;
  }
}

/**
 * Compte le nombre de recettes sauvegardées
 * @returns {Promise<number>}
 */
export async function getRecipesCount() {
  try {
    const db = await openDB();
    
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.RECIPES, 'readonly');
      const store = tx.objectStore(STORES.RECIPES);
      const request = store.count();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
  } catch (error) {
    console.error('Erreur comptage recettes:', error);
    return 0;
  }
}

/**
 * Estime l'utilisation du stockage IndexedDB
 * @returns {Promise<{used: number, available: number, percentage: number}>}
 */
export async function getStorageUsage() {
  try {
    // Utiliser l'API Storage Manager si disponible
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: estimate.quota || 0,
        percentage: estimate.quota ? Math.round((estimate.usage / estimate.quota) * 100) : 0,
      };
    }
    
    // Fallback: estimation basée sur le nombre de recettes
    const count = await getRecipesCount();
    const estimatedUsed = count * 1.5 * 1024 * 1024; // ~1.5 MB par recette
    const estimatedQuota = 50 * 1024 * 1024; // 50 MB estimation conservatrice
    
    return {
      used: estimatedUsed,
      available: estimatedQuota,
      percentage: Math.round((estimatedUsed / estimatedQuota) * 100),
    };
  } catch (error) {
    console.error('Erreur estimation stockage:', error);
    return { used: 0, available: 0, percentage: 0 };
  }
}

/**
 * Formate une taille en bytes en format lisible
 * @param {number} bytes 
 * @returns {string}
 */
export function formatStorageSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ============================================
// INITIALISATION
// ============================================

/**
 * Initialise le stockage et migre les données si nécessaire
 * À appeler au démarrage de l'application
 */
export async function initStorage() {
  try {
    await openDB();
    await migrateApiKey();
    await migrateRecipes();
    console.info('IndexedDB initialisé avec succès');
    return true;
  } catch (error) {
    console.error('Erreur initialisation IndexedDB:', error);
    return false;
  }
}

// Exporter pour les tests
export { openDB, base64ToBlob, blobToBase64 };
