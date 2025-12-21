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

// 30 phrases rigolotes de cuisinier pour le loader (avec emoji séparé)
const CHEF_QUOTES = [
  { text: "Je fais revenir les idées dans la poêle...", emoji: "🍳" },
  { text: "Je touille la créativité à feu doux...", emoji: "🥄" },
  { text: "Je laisse mijoter l'inspiration...", emoji: "🍲" },
  { text: "Je sale avec amour, je poivre avec passion...", emoji: "🧂" },
  { text: "Je consulte mes ancêtres cuisiniers...", emoji: "👨‍🍳" },
  { text: "Je fais flamber l'imagination...", emoji: "🔥" },
  { text: "Je goûte, je rectifie, je perfectionne...", emoji: "👅" },
  { text: "Je pétris la pâte des possibilités...", emoji: "🥖" },
  { text: "Je monte les blancs en neige d'idées...", emoji: "🥚" },
  { text: "Je caramélise les saveurs...", emoji: "🍯" },
  { text: "Je déglace avec un trait de génie...", emoji: "🍷" },
  { text: "Je fais réduire la sauce du doute...", emoji: "🥘" },
  { text: "Je cisèle finement les herbes de la créativité...", emoji: "🌿" },
  { text: "Je fouette énergiquement l'enthousiasme...", emoji: "🥣" },
  { text: "Je laisse reposer la pâte à idées...", emoji: "⏰" },
  { text: "Je préchauffe le four de l'innovation...", emoji: "🔥" },
  { text: "J'émince les légumes de l'inspiration...", emoji: "🥕" },
  { text: "Je fais sauter les préjugés culinaires...", emoji: "🍳" },
  { text: "Je nappe généreusement de gourmandise...", emoji: "🍫" },
  { text: "Je dispose artistiquement dans l'assiette...", emoji: "🎨" },
  { text: "Je vérifie l'assaisonnement cosmique...", emoji: "✨" },
  { text: "Je fais lever la pâte de l'imagination...", emoji: "🥐" },
  { text: "Je gratine le tout avec brio...", emoji: "🧀" },
  { text: "J'ajoute une pincée de magie...", emoji: "✨" },
  { text: "Je fais infuser les arômes du succès...", emoji: "🍵" },
  { text: "J'émulsionne la sauce du bonheur...", emoji: "🥗" },
  { text: "Je tranche dans le vif du sujet...", emoji: "🔪" },
  { text: "Je fais mariner les idées overnight...", emoji: "🌙" },
  { text: "Je dresse l'assiette comme un chef...", emoji: "👨‍🍳" },
  { text: "J'ajoute la touche finale... et voilà !", emoji: "🎉" },
];

function App() {
  const [currentView, setCurrentView] = useState(VIEWS.HOME);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(null);
  const [error, setError] = useState(null);
  const [chefQuote, setChefQuote] = useState({ text: '', emoji: '' });

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
            <div className="generation-emoji">{chefQuote.emoji}</div>
            <p className="generation-quote">
              {chefQuote.text}
            </p>
            <p className="generation-status">
              {generationProgress?.message || 'Génération en cours...'}
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
