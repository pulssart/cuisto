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
 * Génère un résumé court d'une recette pour le partage
 * @param {Object} recipe - La recette à résumer
 * @returns {Promise<string>} Un résumé de quelques lignes
 */
export async function summarizeRecipeForShare(recipe) {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('Clé API OpenAI non configurée. Veuillez la configurer dans les paramètres.');
  }

  const systemPrompt = `Tu es un chef cuisinier qui prépare un texte de partage accrocheur.
Tu dois produire un résumé vivant et concis (3 à 4 phrases maximum) qui donne envie de réaliser la recette.
Mentionne le nom du plat, les saveurs clés, les temps forts de la préparation et le résultat final.
Écris en français, ton chaleureux et dynamique. Pas de listes ni d'émojis.`;

  const { title, category, servings, prepTime, cookTime, restTime, ingredients, instructions, chefComment } = recipe;

  const ingredientsText = ingredients
    ?.map((section) => `${section.section ? `${section.section}: ` : ''}${section.items?.join(', ')}`)
    .join(' | ');

  const instructionsText = instructions
    ?.map((step) => (typeof step === 'string' ? step : step.text))
    .join(' ');

  const userPrompt = `Titre: ${title}
Catégorie: ${category || 'Non spécifiée'}
Portions: ${servings || 'Non spécifiées'}
Préparation: ${prepTime || 'Non spécifiée'}, Cuisson: ${cookTime || '0 min'}, Repos: ${restTime || '0 min'}
Ingrédients: ${ingredientsText || 'Non renseignés'}
Étapes principales: ${instructionsText || 'Non renseignées'}
Commentaire du chef: ${chefComment || 'Non fourni'}`;

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
        temperature: 0.6,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Erreur lors de la génération du résumé');
    }

    const data = await response.json();
    const summary = data.choices[0].message.content?.trim();

    if (!summary) {
      throw new Error('Résumé indisponible');
    }

    return summary;
  } catch (error) {
    console.error('Erreur OpenAI (résumé):', error);
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
    
    // Générer la liste de courses depuis les ingrédients
    onProgress?.({ step: 'shopping', message: 'Préparation de la liste de courses...' });
    const shoppingList = extractShoppingList(recipe);
    
    onProgress?.({ step: 'done', message: 'Terminé !' });
    
    return {
      ...recipe,
      instructions: instructionsWithIllustrations,
      image: imageUrl,
      audioUrl: audioUrl, // URL de l'audio généré
      shoppingList: shoppingList, // Liste de courses pré-générée
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
 * Parse directement les ingrédients sans utiliser GPT
 * @param {Object} recipe - La recette complète
 * @returns {Array} Liste formatée des ingrédients
 */
export function extractShoppingList(recipe) {
  if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
    return [];
  }

  const ingredientsMap = new Map();
  
  // Catégories de base pour classifier les ingrédients
  const categoryKeywords = {
    FRUITS_LEGUMES: ['fruits', 'fruit', 'légumes', 'légume', 'tomate', 'oignon', 'ail', 'carotte', 'pomme', 'banane', 'citron', 'orange', 'salade', 'épinard', 'courgette', 'aubergine', 'poivron', 'champignon', 'avocat', 'fraise', 'framboise', 'myrtille'],
    VIANDES_POISSONS: ['viande', 'boeuf', 'porc', 'poulet', 'volaille', 'agneau', 'canard', 'poisson', 'saumon', 'thon', 'cabillaud', 'crevette', 'coquille', 'moule', 'huître', 'jambon', 'lard', 'bacon', 'chorizo'],
    PRODUITS_LAITIERS: ['lait', 'crème', 'beurre', 'fromage', 'yaourt', 'yogourt', 'mascarpone', 'ricotta', 'mozzarella', 'parmesan', 'emmental', 'chèvre'],
    BOULANGERIE: ['pain', 'baguette', 'brioche', 'croissant', 'pâte', 'farine', 'levure'],
    EPICERIE: ['huile', 'vinaigre', 'sel', 'poivre', 'sucre', 'miel', 'épice', 'curry', 'cumin', 'paprika', 'cannelle', 'vanille', 'riz', 'pâtes', 'semoule', 'couscous', 'lentille', 'haricot', 'pois chiche', 'olive', 'câpre', 'cornichon'],
  };

  // Fonction pour déterminer la catégorie d'un ingrédient
  const getCategory = (ingredientName) => {
    const lowerName = ingredientName.toLowerCase();
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerName.includes(keyword))) {
        return category;
      }
    }
    return 'AUTRES';
  };

  // Parser chaque section d'ingrédients
  recipe.ingredients.forEach(section => {
    if (!section.items || !Array.isArray(section.items)) return;
    
    section.items.forEach(item => {
      // Parser "quantité + nom" (ex: "500g de farine", "2 oignons", "1 cuillère à soupe d'huile")
      const match = item.match(/^(.+?)\s+(?:de\s+|d'|du\s+|de la\s+|des\s+)?(.+)$/i) || 
                    item.match(/^(\d+[^\w]*)\s*(.+)$/i) ||
                    [null, '', item.trim()];
      
      const quantity = match[1]?.trim() || '';
      const name = match[2]?.trim() || item.trim();
      
      // Normaliser le nom (enlever les pluriels, articles, etc.)
      const normalizedName = name
        .toLowerCase()
        .replace(/^(les?|des?|du|de la|de l'|d')\s+/i, '')
        .replace(/s$/, '') // Enlever pluriel simple
        .trim();
      
      // Si l'ingrédient existe déjà, on additionne les quantités si possible
      if (ingredientsMap.has(normalizedName)) {
        const existing = ingredientsMap.get(normalizedName);
        // Essayer d'additionner si les quantités sont numériques
        const qtyMatch = quantity.match(/(\d+(?:[.,]\d+)?)/);
        const existingQtyMatch = existing.quantity.match(/(\d+(?:[.,]\d+)?)/);
        if (qtyMatch && existingQtyMatch) {
          const total = parseFloat(qtyMatch[1].replace(',', '.')) + parseFloat(existingQtyMatch[1].replace(',', '.'));
          existing.quantity = total.toString() + quantity.replace(/\d+(?:[.,]\d+)?/, '').trim();
        } else {
          existing.quantity = `${existing.quantity} + ${quantity}`;
        }
      } else {
        ingredientsMap.set(normalizedName, {
          name: name.charAt(0).toUpperCase() + name.slice(1), // Capitaliser première lettre
          quantity: quantity || 'au goût',
          category: getCategory(name),
        });
      }
    });
  });

  return Array.from(ingredientsMap.values());
}

/**
 * Génère des idées de recette aléatoires
 * Utilise gpt-4o-mini (le modèle le moins cher) pour réduire les coûts
 * @returns {Promise<string>} Une idée de recette
 */
export async function generateRandomRecipeIdea() {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('Clé API OpenAI non configurée');
  }

  // 85% des idées doivent rester simples et accessibles, mais avec des niveaux de créativité variés
  const randomValue = Math.random();
  const mode = randomValue < 0.6 ? 'easy' : randomValue < 0.85 ? 'creative_easy' : 'creative';

  const systemPrompt =
    mode === 'easy'
      ? `Tu es un chef pédagogue qui propose des recettes simples et rapides. Génère une idée de recette facile en une seule phrase.
L'idée doit utiliser des ingrédients courants, être réalisable en moins de 45 minutes et ne requérir que du matériel standard.

IMPORTANT - Accessibilité requise:
- Évite les techniques avancées et les préparations complexes
- Privilégie les plats familiaux ou du quotidien (pâtes gourmandes, sautés, salades composées, plats mijotés simples, desserts rapides)
- Mentionne si possible une astuce pour gagner du temps ou une substitution courante
- Limite le nombre d'ingrédients originaux

Format de réponse obligatoire:
- Donne uniquement un nom ou une idée de recette (comme un intitulé), sans aucune instruction ni formulation à l'impératif
- Pas d'étapes, pas de consignes, pas de verbes d'action dirigés vers l'utilisateur
- Pas d'introduction ni d'explication, juste l'idée elle-même.`
      : mode === 'creative_easy'
        ? `Tu es un chef inventif mais accessible. Génère une idée de recette originale, facile à réaliser et appétissante en une seule phrase.
L'idée doit surprendre par les associations d'ingrédients tout en restant faisable en moins de 60 minutes avec des techniques simples.

IMPORTANT - Créativité accessible:
- Combine un ingrédient original avec des produits courants
- Évite le matériel professionnel et les techniques avancées
- Vise une liste d'ingrédients courte et disponible en supermarché
- Mets en avant une touche créative (épice, herbe fraîche, présentation)

Format de réponse obligatoire:
- Donne uniquement un nom ou une idée de recette (comme un intitulé), sans aucune instruction ni formulation à l'impératif
- Pas d'étapes, pas de consignes, pas de verbes d'action dirigés vers l'utilisateur
- Pas d'introduction ni d'explication, juste l'idée elle-même.`
        : `Tu es un chef cuisinier créatif. Génère une idée de recette originale et appétissante en une seule phrase.
L'idée doit être inspirante, avec des ingrédients intéressants et une description qui donne envie.

IMPORTANT - Diversité requise:
- Évite absolument les recettes trop courantes comme curry, tacos, burgers, pizza, pâtes classiques
- Varie entre entrées, plats principaux et desserts
- Explore différentes cuisines (française, italienne, asiatique, méditerranéenne, fusion, etc.)
- Propose des combinaisons originales d'ingrédients
- Varie les techniques culinaires (braisé, mijoté, grillé, cru, fermenté, etc.)

Exemples de format variés:
- "Une entrée de carpaccio de betterave avec fromage de chèvre et noix"
- "Un plat de canard confit aux cerises et purée de patate douce"
- "Un dessert de tarte tatin revisitée aux poires et épices"
- "Une salade composée aux légumes rôtis et vinaigrette au miel"
- "Un plat de poisson en croûte de sel avec légumes vapeur"
- "Un dessert de mousse au citron vert et basilic"

Format de réponse obligatoire:
- Donne uniquement un nom ou une idée de recette (comme un intitulé), sans aucune instruction ni formulation à l'impératif
- Pas d'étapes, pas de consignes, pas de verbes d'action dirigés vers l'utilisateur
- Pas d'introduction ni d'explication, juste l'idée elle-même.`;

  const userPrompt =
    mode === 'easy'
      ? `Génère une idée de recette aléatoire, facile et appétissante. Vise un temps total inférieur à 45 minutes, des ingrédients disponibles en supermarché et des instructions simples.`
      : mode === 'creative_easy'
        ? `Génère une idée de recette aléatoire, créative mais facile. Propose une association originale tout en restant réalisable rapidement avec des ingrédients accessibles.`
        : `Génère une idée de recette aléatoire, créative et appétissante. Varie les catégories (entrée/plat/dessert), les cuisines et les techniques. Évite les recettes trop populaires comme curry ou tacos.`;

  try {
    const response = await fetch(`${API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Modèle le moins cher
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 1.4, // Température très élevée pour plus de créativité et diversité
        max_tokens: 60, // Un peu plus de tokens pour des descriptions plus variées
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Erreur lors de la génération d\'idée');
    }

    const data = await response.json();
    const idea = data.choices[0].message.content.trim();
    
    return idea;
  } catch (error) {
    console.error('Erreur OpenAI (idée aléatoire):', error);
    throw error;
  }
}

/**
 * Chat avec le chef sur une recette spécifique
 * @param {Object} recipe - La recette complète
 * @param {Array} messages - Historique des messages de conversation
 * @returns {Promise<string>} La réponse du chef
 */
export async function chatWithChef(recipe, messages) {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('Clé API OpenAI non configurée. Veuillez la configurer dans les paramètres.');
  }

  // Construire le contexte de la recette
  const recipeContext = `
RECETTE: ${recipe.title}
Catégorie: ${recipe.category || 'PLATS'}
Portions: ${recipe.servings}
Temps de préparation: ${recipe.prepTime}
Temps de cuisson: ${recipe.cookTime || '0 min'}
Temps de repos: ${recipe.restTime || '0 min'}

INGRÉDIENTS:
${recipe.ingredients?.map(section => {
  let text = section.section ? `${section.section}:\n` : '';
  text += section.items?.map(item => `- ${item}`).join('\n') || '';
  return text;
}).join('\n\n') || 'Aucun ingrédient'}

INSTRUCTIONS:
${recipe.instructions?.map((step, index) => {
  const stepText = typeof step === 'string' ? step : step.text;
  return `${index + 1}. ${stepText}`;
}).join('\n\n') || 'Aucune instruction'}

${recipe.chefComment ? `COMMENTAIRE DU CHEF: ${recipe.chefComment}` : ''}
`.trim();

  const systemPrompt = `Tu es un chef cuisinier expert et passionné. Tu discutes avec un utilisateur à propos de cette recette précise.

CONTEXTE DE LA RECETTE:
${recipeContext}

Tu dois:
- Répondre de manière chaleureuse et professionnelle, comme un vrai chef
- T'aider du contexte de la recette pour répondre aux questions
- Donner des conseils pratiques, des astuces, des alternatives d'ingrédients
- Expliquer les techniques culinaires si nécessaire
- Être concis mais complet dans tes réponses
- Utiliser "tu" pour être proche et accessible

Réponds uniquement en français.`;

  // Construire les messages pour l'API
  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  ];

  try {
    const response = await fetch(`${API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Modèle économique pour le chat
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Erreur lors de la conversation avec le chef');
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Erreur OpenAI (chat avec le chef):', error);
    throw error;
  }
}

export { TIME_OPTIONS, DIFFICULTY_OPTIONS, AUDIENCE_OPTIONS, TYPE_OPTIONS };
