import { useState, useEffect } from 'react';
import { ChefHatIcon, SettingsIcon, BookmarkIcon } from './icons';
import { TIME_OPTIONS, DIFFICULTY_OPTIONS, AUDIENCE_OPTIONS, TYPE_OPTIONS, generateRandomRecipeIdea } from '../services/openai';
import { hasApiKey, getRecipesCount } from '../services/storage';
import './HomePage.css';

export default function HomePage({ onGenerate, onOpenSettings, onOpenSaved, isGenerating }) {
  const [prompt, setPrompt] = useState('');
  const [timeIndex, setTimeIndex] = useState(1); // 30 min par défaut
  const [difficultyIndex, setDifficultyIndex] = useState(1); // Facile
  const [audienceIndex, setAudienceIndex] = useState(3); // Toute la famille
  const [typeIndex, setTypeIndex] = useState(0); // Salé
  const [savedRecipesCount, setSavedRecipesCount] = useState(0);
  const [isLoadingRandom, setIsLoadingRandom] = useState(false);

  const apiConfigured = hasApiKey();

  // Charger le nombre de recettes au montage
  useEffect(() => {
    const loadCount = async () => {
      const count = await getRecipesCount();
      setSavedRecipesCount(count);
    };
    loadCount();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim() || !apiConfigured || isGenerating) return;
    
    onGenerate({
      prompt: prompt.trim(),
      timeIndex,
      difficultyIndex,
      audienceIndex,
      typeIndex,
    });
  };

  const handleRandomIdea = async () => {
    if (!apiConfigured || isGenerating || isLoadingRandom) return;
    
    setIsLoadingRandom(true);
    try {
      const idea = await generateRandomRecipeIdea();
      setPrompt(idea);
    } catch (error) {
      console.error('Erreur génération idée aléatoire:', error);
      alert(error.message || 'Erreur lors de la génération d\'une idée aléatoire');
    } finally {
      setIsLoadingRandom(false);
    }
  };

  return (
    <div className="home-page">
      {/* Header */}
      <header className="home-header">
        <div className="header-actions">
          <button 
            className="btn-icon" 
            onClick={onOpenSaved}
            aria-label={`Recettes sauvegardées (${savedRecipesCount})`}
          >
            <BookmarkIcon size={22} />
            {savedRecipesCount > 0 && (
              <span className="badge">{savedRecipesCount}</span>
            )}
          </button>
          <button 
            className="btn-icon" 
            onClick={onOpenSettings}
            aria-label="Paramètres"
          >
            <SettingsIcon size={22} />
            {!apiConfigured && <span className="badge badge-warning">!</span>}
          </button>
        </div>
      </header>

      {/* Logo et titre */}
      <div className="home-hero">
        <div className="logo-container">
          <ChefHatIcon size={64} color="var(--color-accent)" />
        </div>
        <h1 className="app-title">Cuisto</h1>
        <p className="app-tagline">Créez des recettes uniques en un instant</p>
      </div>

      {/* Formulaire */}
      <form className="home-form" onSubmit={handleSubmit}>
        {/* Prompt */}
        <div className="form-section prompt-section">
          <div className="prompt-header">
            <label htmlFor="prompt" className="form-label">
              Quelle est votre envie ?
            </label>
            <button
              type="button"
              className="btn-random"
              onClick={handleRandomIdea}
              disabled={!apiConfigured || isGenerating || isLoadingRandom}
              aria-label="Générer une idée aléatoire"
            >
              {isLoadingRandom ? (
                <span className="spinner-small"></span>
              ) : (
                <span>🎲</span>
              )}
              <span>Aléatoire</span>
            </button>
          </div>
          <textarea
            id="prompt"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Ex: Un plat réconfortant avec des champignons et du fromage..."
            className="prompt-input"
            rows={3}
            disabled={isGenerating}
          />
        </div>

        {/* Sliders */}
        <div className="sliders-container">
          {/* Temps */}
          <div className="slider-group">
            <label className="slider-label">
              <span className="slider-icon">⏱</span>
              Temps disponible
            </label>
            <input
              type="range"
              min={0}
              max={TIME_OPTIONS.length - 1}
              value={timeIndex}
              onChange={e => setTimeIndex(Number(e.target.value))}
              className="slider"
              disabled={isGenerating}
            />
            <div className="slider-value">{TIME_OPTIONS[timeIndex]}</div>
          </div>

          {/* Difficulté */}
          <div className="slider-group">
            <label className="slider-label">
              <span className="slider-icon">📊</span>
              Difficulté
            </label>
            <input
              type="range"
              min={0}
              max={DIFFICULTY_OPTIONS.length - 1}
              value={difficultyIndex}
              onChange={e => setDifficultyIndex(Number(e.target.value))}
              className="slider"
              disabled={isGenerating}
            />
            <div className="slider-value">{DIFFICULTY_OPTIONS[difficultyIndex]}</div>
          </div>

          {/* Public */}
          <div className="slider-group">
            <label className="slider-label">
              <span className="slider-icon">👨‍👩‍👧‍👦</span>
              Pour qui ?
            </label>
            <input
              type="range"
              min={0}
              max={AUDIENCE_OPTIONS.length - 1}
              value={audienceIndex}
              onChange={e => setAudienceIndex(Number(e.target.value))}
              className="slider"
              disabled={isGenerating}
            />
            <div className="slider-value">{AUDIENCE_OPTIONS[audienceIndex]}</div>
          </div>

          {/* Type */}
          <div className="slider-group">
            <label className="slider-label">
              <span className="slider-icon">🍽</span>
              Type de plat
            </label>
            <input
              type="range"
              min={0}
              max={TYPE_OPTIONS.length - 1}
              value={typeIndex}
              onChange={e => setTypeIndex(Number(e.target.value))}
              className="slider"
              disabled={isGenerating}
            />
            <div className="slider-value">{TYPE_OPTIONS[typeIndex]}</div>
          </div>
        </div>

        {/* Bouton générer */}
        <button
          type="submit"
          className="btn-primary generate-btn"
          disabled={!prompt.trim() || !apiConfigured || isGenerating}
        >
          {isGenerating ? (
            <>
              <span className="spinner"></span>
              Création en cours...
            </>
          ) : (
            <>
              <ChefHatIcon size={20} />
              Générer ma recette
            </>
          )}
        </button>

        {!apiConfigured && (
          <p className="api-warning">
            ⚠️ Configurez votre clé API OpenAI dans les{' '}
            <button type="button" className="link-button" onClick={onOpenSettings}>
              paramètres
            </button>
          </p>
        )}
      </form>
    </div>
  );
}
