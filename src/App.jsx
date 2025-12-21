import { useState, useCallback, useEffect } from 'react';
import HomePage from './components/HomePage';
import RecipeView from './components/RecipeView';
import SavedRecipes from './components/SavedRecipes';
import SettingsModal from './components/SettingsModal';
import { generateFullRecipe } from './services/openai';
import './App.css';

// États de l'application
const VIEWS = {
  HOME: 'home',
  RECIPE: 'recipe',
  SAVED: 'saved',
};

// 30 phrases rigolotes de cuisinier pour le loader
const CHEF_QUOTES = [
  "Je fais revenir les idées dans la poêle... 🍳",
  "Je touille la créativité à feu doux... 🥄",
  "Je laisse mijoter l'inspiration... 🍲",
  "Je sale avec amour, je poivre avec passion... 🧂",
  "Je consulte mes ancêtres cuisiniers... 👨‍🍳",
  "Je fais flamber l'imagination... 🔥",
  "Je goûte, je rectifie, je perfectionne... 👅",
  "Je pétris la pâte des possibilités... 🥖",
  "Je monte les blancs en neige d'idées... 🥚",
  "Je caramélise les saveurs... 🍯",
  "Je déglace avec un trait de génie... 🍷",
  "Je fais réduire la sauce du doute... 🥘",
  "Je cisèle finement les herbes de la créativité... 🌿",
  "Je fouette énergiquement l'enthousiasme... 🥣",
  "Je laisse reposer la pâte à idées... ⏰",
  "Je préchauffe le four de l'innovation... 🔥",
  "Je émince les légumes de l'inspiration... 🥕",
  "Je fais sauter les préjugés culinaires... 🍳",
  "Je nappe généreusement de gourmandise... 🍫",
  "Je dispose artistiquement dans l'assiette... 🎨",
  "Je vérifie l'assaisonnement cosmique... ✨",
  "Je fais lever la pâte de l'imagination... 🥐",
  "Je gratine le tout avec brio... 🧀",
  "Je ajoute une pincée de magie... ✨",
  "Je fais infuser les arômes du succès... 🍵",
  "Je émulsionne la sauce du bonheur... 🥗",
  "Je tranche dans le vif du sujet... 🔪",
  "Je fais mariner les idées overnight... 🌙",
  "Je dresse l'assiette comme un chef... 👨‍🍳",
  "Je ajoute la touche finale... et voilà ! 🎉",
];

function App() {
  const [currentView, setCurrentView] = useState(VIEWS.HOME);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(null);
  const [error, setError] = useState(null);
  const [chefQuote, setChefQuote] = useState('');

  // Changer la phrase toutes les 3 secondes pendant la génération
  useEffect(() => {
    if (isGenerating) {
      // Phrase initiale aléatoire
      setChefQuote(CHEF_QUOTES[Math.floor(Math.random() * CHEF_QUOTES.length)]);
      
      const interval = setInterval(() => {
        setChefQuote(CHEF_QUOTES[Math.floor(Math.random() * CHEF_QUOTES.length)]);
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [isGenerating]);

  // Génération d'une recette
  const handleGenerate = useCallback(async (params) => {
    setIsGenerating(true);
    setError(null);
    setGenerationProgress({ step: 'start', message: 'Démarrage...' });

    try {
      const recipe = await generateFullRecipe(params, setGenerationProgress);
      setCurrentRecipe(recipe);
      setCurrentView(VIEWS.RECIPE);
    } catch (err) {
      setError(err.message || 'Une erreur est survenue');
      console.error('Erreur de génération:', err);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  }, []);

  // Navigation
  const goHome = useCallback(() => {
    setCurrentView(VIEWS.HOME);
    setError(null);
  }, []);

  const goToSaved = useCallback(() => {
    setCurrentView(VIEWS.SAVED);
  }, []);

  const openSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  // Sélection d'une recette sauvegardée
  const handleSelectRecipe = useCallback((recipe) => {
    setCurrentRecipe(recipe);
    setCurrentView(VIEWS.RECIPE);
  }, []);

  // Callback quand une recette est sauvegardée
  const handleRecipeSaved = useCallback((savedRecipe) => {
    setCurrentRecipe(savedRecipe);
  }, []);

  return (
    <div className="app">
      {/* Overlay de génération */}
      {isGenerating && (
        <div className="generation-overlay">
          <div className="generation-modal">
            <div className="generation-spinner"></div>
            <p className="generation-status">
              {generationProgress?.message || 'Génération en cours...'}
            </p>
            <p className="generation-quote">
              {chefQuote}
            </p>
          </div>
        </div>
      )}

      {/* Erreur */}
      {error && currentView === VIEWS.HOME && (
        <div className="error-toast" onClick={() => setError(null)}>
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
          <button className="error-close">×</button>
        </div>
      )}

      {/* Vues principales */}
      <main className="app-main">
        {currentView === VIEWS.HOME && (
          <HomePage
            onGenerate={handleGenerate}
            onOpenSettings={openSettings}
            onOpenSaved={goToSaved}
            isGenerating={isGenerating}
          />
        )}

        {currentView === VIEWS.RECIPE && currentRecipe && (
          <RecipeView
            recipe={currentRecipe}
            onBack={goHome}
            onSaved={handleRecipeSaved}
          />
        )}

        {currentView === VIEWS.SAVED && (
          <SavedRecipes
            onBack={goHome}
            onSelectRecipe={handleSelectRecipe}
          />
        )}
      </main>

      {/* Modal paramètres */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={closeSettings}
      />
    </div>
  );
}

export default App;
