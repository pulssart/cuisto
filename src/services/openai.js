/**
 * Service OpenAI pour Cuisto
 * Utilise gpt-4o pour le texte et gpt-image-1 pour les images
 */

import { getApiKey } from './storage';

const API_URL = 'https://api.openai.com/v1';

// Modèles OpenAI
const TEXT_MODEL = 'gpt-5.2';
const IMAGE_MODEL = 'gpt-image-1.5';

/**
 * Configuration des paramètres pour le prompt
 */
const TIME_OPTIONS = ['15 minutes', '30 minutes', '1 heure', '2 heures', '3 heures ou plus'];
const DIFFICULTY_OPTIONS = ['Très facile', 'Facile', 'Moyen', 'Difficile'];
const AUDIENCE_OPTIONS = ['Enfants', 'Adultes', 'Seniors', 'Toute la famille'];
const TYPE_OPTIONS = ['Salé', 'Sucré', 'Sucré-salé'];

/**
 * Génère une recette à partir d'un prompt et de paramètres
 * @param {Object} params
 * @param {string} params.prompt - L'idée ou les ingrédients
 * @param {number} params.timeIndex - Index du temps disponible (0-4)
 * @param {number} params.difficultyIndex - Index de la difficulté (0-3)
 * @param {number} params.audienceIndex - Index du public (0-3)
 * @param {number} params.typeIndex - Index du type (0-2)
 * @returns {Promise<Object>} La recette générée
 */
export async function generateRecipe({ prompt, timeIndex, difficultyIndex, audienceIndex, typeIndex }) {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('Clé API OpenAI non configurée. Veuillez la configurer dans les paramètres.');
  }

  const time = TIME_OPTIONS[timeIndex] || TIME_OPTIONS[1];
  const difficulty = DIFFICULTY_OPTIONS[difficultyIndex] || DIFFICULTY_OPTIONS[1];
  const audience = AUDIENCE_OPTIONS[audienceIndex] || AUDIENCE_OPTIONS[3];
  const type = TYPE_OPTIONS[typeIndex] || TYPE_OPTIONS[0];

  const systemPrompt = `Tu es un chef cuisinier expert qui crée des recettes détaillées et délicieuses. 
Tu dois générer une recette en JSON avec exactement cette structure:

{
  "title": "Nom de la recette (créatif et appétissant)",
  "category": "ENTRÉES" ou "PLATS" ou "DESSERTS",
  "servings": "X personnes",
  "prepTime": "XX min",
  "cookTime": "XX min" (mettre "0 min" si pas de cuisson),
  "restTime": "XX min" (mettre "0 min" si pas de repos),
  "ingredients": [
    {
      "section": "Nom de la section (ex: Pour la pâte)",
      "items": ["quantité + ingrédient", "quantité + ingrédient"]
    }
  ],
  "instructions": [
    "Description très détaillée de l'étape avec explications, astuces et conseils..."
  ],
  "imagePrompt": "Description détaillée en anglais pour générer une photo appétissante du plat fini, servi dans une belle assiette moderne blanche, style food photography professionnel, lumière naturelle douce, vue légèrement en plongée"
}

Respecte ces contraintes:
- Temps total de préparation: ${time}
- Niveau de difficulté: ${difficulty}
- Public cible: ${audience}
- Type de plat: ${type}

IMPORTANT pour les instructions:
- Maximum 4 à 5 étapes principales
- Chaque étape doit être TRÈS détaillée (3-4 phrases minimum)
- Inclus des explications sur le pourquoi, des astuces de chef, et des conseils pour réussir
- Regroupe les actions similaires dans une même étape

Sois précis dans les quantités et les temps de cuisson.`;

  const userPrompt = `Crée une recette avec cette idée ou ces ingrédients: ${prompt}`;

  try {
    const response = await fetch(`${API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: TEXT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Erreur lors de la génération de la recette');
    }

    const data = await response.json();
    const recipe = JSON.parse(data.choices[0].message.content);
    
    return recipe;
  } catch (error) {
    console.error('Erreur OpenAI (texte):', error);
    throw error;
  }
}

/**
 * Génère une image pour une recette
 * @param {string} imagePrompt - Le prompt de description de l'image
 * @returns {Promise<string>} L'URL de l'image en base64
 */
export async function generateRecipeImage(imagePrompt) {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('Clé API OpenAI non configurée');
  }

  const enhancedPrompt = `Professional food photography of ${imagePrompt}. The dish is beautifully plated on a modern white ceramic plate, placed on a light wooden table with soft natural lighting. Shallow depth of field, appetizing presentation, high-end restaurant quality, no text or watermarks.`;

  try {
    const response = await fetch(`${API_URL}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt: enhancedPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'high',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      // Fallback sur DALL-E 3 si gpt-image-1 n'est pas disponible
      if (error.error?.code === 'model_not_found') {
        return generateRecipeImageDallE(imagePrompt);
      }
      throw new Error(error.error?.message || 'Erreur lors de la génération de l\'image');
    }

    const data = await response.json();
    
    // gpt-image-1 retourne b64_json par défaut
    if (data.data[0].b64_json) {
      return `data:image/png;base64,${data.data[0].b64_json}`;
    }
    
    return data.data[0].url;
  } catch (error) {
    console.error('Erreur OpenAI (image):', error);
    // Essayer DALL-E 3 en fallback
    try {
      return await generateRecipeImageDallE(imagePrompt);
    } catch (fallbackError) {
      throw error;
    }
  }
}

/**
 * Fallback: Génère une image avec DALL-E 3
 * @param {string} imagePrompt 
 * @returns {Promise<string>}
 */
async function generateRecipeImageDallE(imagePrompt) {
  const apiKey = getApiKey();
  
  const enhancedPrompt = `Professional food photography of ${imagePrompt}. The dish is beautifully plated on a modern white ceramic plate, placed on a light wooden table with soft natural lighting. Shallow depth of field, appetizing presentation, high-end restaurant quality, no text or watermarks.`;

  const response = await fetch(`${API_URL}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt: enhancedPrompt,
      n: 1,
      size: '1024x1024',
      quality: 'high',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Erreur lors de la génération de l\'image');
  }

  const data = await response.json();
  return data.data[0].url;
}

/**
 * Génère une recette complète avec image
 * @param {Object} params - Les paramètres de génération
 * @param {Function} onProgress - Callback de progression
 * @returns {Promise<Object>} La recette avec l'image
 */
export async function generateFullRecipe(params, onProgress) {
  try {
    onProgress?.({ step: 'recipe', message: 'Création de la recette...' });
    const recipe = await generateRecipe(params);
    
    onProgress?.({ step: 'image', message: 'Génération de la photo...' });
    const imageUrl = await generateRecipeImage(recipe.imagePrompt);
    
    onProgress?.({ step: 'done', message: 'Terminé !' });
    
    return {
      ...recipe,
      image: imageUrl,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    onProgress?.({ step: 'error', message: error.message });
    throw error;
  }
}

export { TIME_OPTIONS, DIFFICULTY_OPTIONS, AUDIENCE_OPTIONS, TYPE_OPTIONS };

