/**
 * Service OpenAI pour Cuisto
 * Utilise gpt-5.2 pour le texte et gpt-image-1.5 pour les images
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
  "chefComment": "Un commentaire passionné du chef (2-3 phrases) qui décrit cette recette avec amour, évoque les saveurs, les textures, l'histoire ou l'inspiration derrière ce plat. Écrit à la première personne comme si le chef parlait directement au lecteur.",
  "ingredients": [
    {
      "section": "Nom de la section (ex: Pour la pâte)",
      "items": ["quantité + ingrédient", "quantité + ingrédient"]
    }
  ],
  "instructions": [
    {
      "text": "Description très détaillée de l'étape avec explications, astuces et conseils...",
      "illustrationPrompt": "Description en anglais pour une illustration au crayon à papier montrant l'action principale de cette étape (ex: hands kneading dough on wooden surface)"
    }
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
- Pour chaque illustrationPrompt, décris l'action principale visuellement (mains qui cuisinent, ustensiles, gestes)

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
 * Génère une image pour une recette (photo du plat)
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
        // Note: gpt-image-1.5 retourne du base64 par défaut dans b64_json
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Erreur lors de la génération de l\'image');
    }

    const data = await response.json();
    
    if (data.data[0].b64_json) {
      return `data:image/png;base64,${data.data[0].b64_json}`;
    }
    
    return data.data[0].url;
  } catch (error) {
    console.error('Erreur OpenAI (image):', error);
    throw error;
  }
}

/**
 * Génère une illustration style crayon à papier pour une étape
 * @param {string} illustrationPrompt - Le prompt de description
 * @returns {Promise<string>} L'URL de l'image en base64
 */
export async function generateStepIllustration(illustrationPrompt) {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('Clé API OpenAI non configurée');
  }

  const enhancedPrompt = `Pencil sketch illustration, hand-drawn style: ${illustrationPrompt}. Simple elegant pencil drawing on white paper, cooking illustration, minimal shading, clean lines, artistic sketch style, no color, black and white pencil art, cookbook illustration style.`;

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
        quality: 'medium',
        // Note: gpt-image-1.5 retourne du base64 par défaut dans b64_json
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Erreur lors de la génération de l\'illustration');
    }

    const data = await response.json();
    
    if (data.data[0].b64_json) {
      return `data:image/png;base64,${data.data[0].b64_json}`;
    }
    
    return data.data[0].url;
  } catch (error) {
    console.error('Erreur OpenAI (illustration):', error);
    throw error;
  }
}

/**
 * Génère une recette complète avec image et illustrations des étapes
 * @param {Object} params - Les paramètres de génération
 * @param {Function} onProgress - Callback de progression
 * @returns {Promise<Object>} La recette avec l'image et les illustrations
 */
export async function generateFullRecipe(params, onProgress) {
  try {
    onProgress?.({ step: 'recipe', message: 'Création de la recette...' });
    const recipe = await generateRecipe(params);
    
    onProgress?.({ step: 'image', message: 'Génération de la photo...' });
    const imageUrl = await generateRecipeImage(recipe.imagePrompt);
    
    // Générer les illustrations pour chaque étape
    const instructionsWithIllustrations = [];
    const totalSteps = recipe.instructions.length;
    
    for (let i = 0; i < totalSteps; i++) {
      const instruction = recipe.instructions[i];
      const stepText = typeof instruction === 'string' ? instruction : instruction.text;
      const illustrationPrompt = typeof instruction === 'string' 
        ? `cooking step: ${stepText.substring(0, 100)}` 
        : instruction.illustrationPrompt;
      
      onProgress?.({ 
        step: 'illustrations', 
        message: `Illustration étape ${i + 1}/${totalSteps}...` 
      });
      
      try {
        const illustration = await generateStepIllustration(illustrationPrompt);
        instructionsWithIllustrations.push({
          text: stepText,
          illustration: illustration,
        });
      } catch (error) {
        console.error(`Erreur illustration étape ${i + 1}:`, error);
        // En cas d'erreur, on continue sans illustration pour cette étape
        instructionsWithIllustrations.push({
          text: stepText,
          illustration: null,
        });
      }
    }
    
    // Générer l'audio du commentaire du chef
    let audioUrl = null;
    if (recipe.chefComment) {
      onProgress?.({ step: 'audio', message: 'Génération de l\'audio du chef...' });
      try {
        audioUrl = await generateChefAudio(recipe.chefComment);
      } catch (error) {
        console.error('Erreur génération audio:', error);
        // On continue sans audio si erreur
      }
    }
    
    onProgress?.({ step: 'done', message: 'Terminé !' });
    
    return {
      ...recipe,
      instructions: instructionsWithIllustrations,
      image: imageUrl,
      audioUrl: audioUrl, // URL de l'audio généré
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    onProgress?.({ step: 'error', message: error.message });
    throw error;
  }
}

/**
 * Génère un audio TTS du commentaire du chef
 * @param {string} text - Le texte à lire
 * @returns {Promise<string>} URL blob de l'audio
 */
export async function generateChefAudio(text) {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('Clé API OpenAI non configurée');
  }

  try {
    const response = await fetch(`${API_URL}/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: 'onyx', // Voix grave et chaleureuse, parfaite pour un chef
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Erreur lors de la génération audio');
    }

    // Convertir la réponse en blob audio
    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
  } catch (error) {
    console.error('Erreur OpenAI (TTS):', error);
    throw error;
  }
}

/**
 * Extrait et formate les ingrédients d'une recette pour une liste de courses
 * @param {Object} recipe - La recette complète
 * @returns {Promise<Array>} Liste formatée des ingrédients
 */
export async function extractShoppingList(recipe) {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('Clé API OpenAI non configurée');
  }

  // Construire le texte de la recette pour GPT
  const recipeText = `
Titre: ${recipe.title}
Catégorie: ${recipe.category}
Portions: ${recipe.servings}

Ingrédients:
${recipe.ingredients?.map(section => {
  const sectionTitle = section.section ? `${section.section}:\n` : '';
  return sectionTitle + section.items?.map(item => `- ${item}`).join('\n');
}).join('\n\n')}

Instructions:
${recipe.instructions?.map((inst, i) => {
  const text = typeof inst === 'string' ? inst : inst.text;
  return `${i + 1}. ${text}`;
}).join('\n\n')}
  `.trim();

  const systemPrompt = `Tu es un assistant qui extrait et formate les ingrédients d'une recette pour créer une liste de courses pratique.

Analyse la recette et extrais TOUS les ingrédients nécessaires. Pour chaque ingrédient, normalise la quantité et le format.

Retourne un JSON avec cette structure exacte:
{
  "ingredients": [
    {
      "name": "Nom de l'ingrédient (sans quantité)",
      "quantity": "Quantité normalisée (ex: '500g', '2', '1 cuillère à soupe')",
      "category": "FRUITS_LEGUMES" | "VIANDES_POISSONS" | "EPICERIE" | "PRODUITS_LAITIERS" | "BOULANGERIE" | "AUTRES"
    }
  ]
}

Règles importantes:
- Regroupe les ingrédients similaires (ex: "oignon" et "oignon jaune" → "oignon")
- Normalise les unités (g, kg, ml, cl, L, cuillères, etc.)
- Si une quantité est mentionnée plusieurs fois, additionne-les
- Classe par catégorie logique
- Garde les quantités exactes de la recette`;

  try {
    const response = await fetch(`${API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Utiliser mini pour réduire les coûts
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extrais les ingrédients de cette recette:\n\n${recipeText}` },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Erreur lors de l\'extraction des ingrédients');
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    
    return result.ingredients || [];
  } catch (error) {
    console.error('Erreur extraction liste de courses:', error);
    throw error;
  }
}

export { TIME_OPTIONS, DIFFICULTY_OPTIONS, AUDIENCE_OPTIONS, TYPE_OPTIONS };
