import { useState, useCallback } from 'react';
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

function App() {
  const [currentView, setCurrentView] = useState(VIEWS.HOME);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(null);
  const [error, setError] = useState(null);

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
            <p className="generation-message">
              {generationProgress?.message || 'Génération en cours...'}
            </p>
            <p className="generation-hint">
              Cela peut prendre jusqu'à 30 secondes
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
