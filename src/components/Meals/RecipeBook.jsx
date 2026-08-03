import React, { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useFamily } from '../../context/FamilyContext';
import CookingModeModal from './CookingModeModal';
import {
  BookOpen,
  Plus,
  Download,
  Trash2,
  Clock,
  Users,
  Play,
  Globe2,
  ImageOff,
  ShoppingBag,
  Share2,
  Smartphone,
  CheckCircle2
} from 'lucide-react';
import { recipeShareTargetFromUrl } from '../../../shared/recipeShareTarget.js';
import { plannerApiRequest } from '../../utils/apiConfig.js';

function RecipeImage({ src, alt }) {
  const { t } = useTranslation('meals');
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="recipe-image-fallback" role="img" aria-label={t('recipeBook.image.noImageAria', { title: alt })}>
        <ImageOff size={28} />
        <span>{t('recipeBook.image.unavailable')}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
}

export default function RecipeBook() {
  const { t } = useTranslation('meals');
  const { savedRecipes, addRecipe, deleteRecipe, addMealIngredientsToShopping, showToast } = useFamily();
  const initialShareTarget = useRef(
    recipeShareTargetFromUrl(window.location.href)
  );
  const shareImportStarted = useRef(false);

  const [activeTab, setActiveTab] = useState(
    initialShareTarget.current.isShareTarget ? 'import' : 'browse'
  ); // 'browse', 'import', 'manual'
  const [cookingRecipe, setCookingRecipe] = useState(null);

  // Import State
  const [urlInput, setUrlInput] = useState(
    initialShareTarget.current.url
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sharedImport, setSharedImport] = useState(
    initialShareTarget.current.isShareTarget
  );

  // Manual Form State
  const [manualTitle, setManualTitle] = useState('');
  const [manualPrepTime, setManualPrepTime] = useState('30 Min');
  const [manualServings, setManualServings] = useState('4 Portionen');
  const [manualImage, setManualImage] = useState('');

  const importRecipeUrl = async rawUrl => {
    if (!rawUrl.trim()) return null;
    let targetUrl = rawUrl.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await plannerApiRequest('/api/recipes/import', {
        method: 'POST',
        body: JSON.stringify({ url: targetUrl })
      });
      if (data.error) {
        throw new Error(data.error || t('recipeBook.errors.importFailed'));
      }

      const saved = await addRecipe(data.recipe);
      if (!saved) {
        throw new Error(t('recipeBook.errors.saveFailed'));
      }
      setUrlInput('');
      setActiveTab('browse');
      setSharedImport(false);
      const warning = Array.isArray(data.warnings) ? data.warnings[0] : '';
      showToast(
        warning ? t('recipeBook.toasts.importedCheckTitle') : t('recipeBook.toasts.importedTitle'),
        warning || t('recipeBook.toasts.importedBody', { title: data.recipe.title }),
        warning ? 'info' : 'success'
      );
      return saved;
    } catch (err) {
      setError(err.message);
      showToast(t('recipeBook.toasts.importErrorTitle'), err.message, 'error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Handle public recipe pages and recipe-rich Pinterest pins.
  const handleImportUrl = async (e) => {
    e.preventDefault();
    await importRecipeUrl(urlInput);
  };

  useEffect(() => {
    const payload = initialShareTarget.current;
    if (!payload.isShareTarget || shareImportStarted.current) return;
    shareImportStarted.current = true;
    window.history.replaceState({}, '', '/?view=meals');
    if (!payload.url) {
      setError(t('recipeBook.errors.shareMissingLink'));
      return;
    }
    void importRecipeUrl(payload.url);
  }, []);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    addRecipe({
      title: manualTitle,
      prepTime: manualPrepTime,
      servings: manualServings,
      image: manualImage || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=600&q=80',
      ingredients: [1, 2].map(number =>
        t('recipeBook.manual.placeholderIngredient', { number })
      ),
      instructions: [1, 2].map(number =>
        t('recipeBook.manual.placeholderStep', { number })
      )
    });

    setManualTitle('');
    setActiveTab('browse');
    showToast(t('recipeBook.toasts.manualCreatedTitle'), t('recipeBook.toasts.manualCreatedBody', { title: manualTitle }), 'success');
  };

  return (
    <div className="recipe-book-shell">
      {/* Header Bar */}
      <div className="card recipe-book-header">
        <div className="recipe-book-header-copy">
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen style={{ color: 'var(--primary)' }} /> {t('recipeBook.header.title')}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {t('recipeBook.header.subtitle')}
          </p>
        </div>

        <div className="recipe-book-tabs">
          <button
            className={`btn-secondary ${activeTab === 'browse' ? 'active' : ''}`}
            onClick={() => setActiveTab('browse')}
          >
            {t('recipeBook.tabs.browse', { count: savedRecipes.length })}
          </button>
          <button
            className={`btn-secondary ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => setActiveTab('import')}
            style={{ color: '#059669', borderColor: '#059669' }}
          >
            <Download size={16} /> {t('recipeBook.tabs.import')}
          </button>
          <button
            className={`btn-primary ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            <Plus size={16} /> {t('recipeBook.tabs.manual')}
          </button>
        </div>
      </div>

      {/* TAB 1: BROWSE RECIPES */}
      {activeTab === 'browse' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {savedRecipes.map(recipe => (
            <div key={recipe.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'relative', height: 160 }}>
                <RecipeImage src={recipe.image} alt={recipe.title} />
                <button
                  className="icon-circle-btn"
                  style={{ position: 'absolute', top: 10, right: 10, background: 'var(--bg-elevated)', width: 32, height: 32, color: 'var(--danger)' }}
                  onClick={() => deleteRecipe(recipe.id)}
                  title={t('recipeBook.card.deleteTitle')}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 6, color: 'var(--text-main)' }}>
                    {recipe.title}
                  </h3>

                  <div style={{ display: 'flex', gap: 14, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={14} /> {recipe.prepTime || t('recipeBook.card.defaultPrepTime')}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={14} /> {recipe.servings || t('recipeBook.card.defaultServings')}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: 'center', padding: '8px 12px', fontSize: '0.85rem' }}
                    onClick={() => setCookingRecipe(recipe)}
                  >
                    <Play size={15} /> {t('recipeBook.card.startCooking')}
                  </button>

                  <button
                    className="btn-secondary"
                    style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                    onClick={() => addMealIngredientsToShopping(recipe.ingredients || [])}
                    title={t('recipeBook.card.addIngredientsTitle')}
                  >
                    <ShoppingBag size={15} /> {t('recipeBook.card.addIngredients')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: CHEFKOCH / WEB IMPORT */}
      {activeTab === 'import' && (
        <div className="card recipe-import-card">
          {sharedImport && (
            <div className="recipe-share-arrival">
              <span><Share2 size={19} /></span>
              <div>
                <strong>{t('recipeBook.import.shareArrivalTitle')}</strong>
                <small>
                  {t('recipeBook.import.shareArrivalBody')}
                </small>
              </div>
              {loading
                ? <span className="recipe-share-pulse" aria-label={t('recipeBook.import.importRunningAria')} />
                : <CheckCircle2 size={18} />}
            </div>
          )}
          <div className="recipe-import-mark">
            <Globe2 size={25} />
          </div>
          <span className="recipe-import-kicker">{t('recipeBook.import.kicker')}</span>
          <h3>
            {t('recipeBook.import.title')}
          </h3>
          <p>
            {t('recipeBook.import.description')}
          </p>
          <div className="recipe-platform-chips" aria-label={t('recipeBook.import.platformsAria')}>
            <span className="pinterest">Pinterest</span>
            <span>Chefkoch</span>
            <span>Lecker</span>
            <span>Kitchen Stories</span>
            <span>Essen &amp; Trinken</span>
            <span>{t('recipeBook.import.morePlatforms')}</span>
          </div>

          <div className="recipe-share-howto">
            <Smartphone size={19} />
            <span>
              <Trans t={t} i18nKey="recipeBook.import.howto" components={{ b: <b /> }} />
            </span>
          </div>

          <form onSubmit={handleImportUrl}>
            <div className="form-group">
              <label className="form-label">{t('recipeBook.import.urlLabel')}</label>
              <input
                type="url"
                className="form-input"
                placeholder={t('recipeBook.import.urlPlaceholder')}
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                required
              />
            </div>

            {error && (
              <div style={{ padding: 10, background: 'color-mix(in srgb, var(--danger) 11%, var(--bg-elevated))', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', background: '#059669', padding: 12 }}
            >
              {loading ? t('recipeBook.import.submitLoading') : t('recipeBook.import.submit')}
            </button>
            <small className="recipe-import-help">
              {t('recipeBook.import.help')}
            </small>
          </form>
        </div>
      )}

      {/* TAB 3: MANUAL RECIPE FORM */}
      {activeTab === 'manual' && (
        <div className="card" style={{ maxWidth: 640, margin: '0 auto', width: '100%', padding: 28 }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 16 }}>{t('recipeBook.manual.title')}</h3>
          <form onSubmit={handleManualSubmit}>
            <div className="form-group">
              <label className="form-label">{t('recipeBook.manual.dishTitleLabel')}</label>
              <input
                type="text"
                className="form-input"
                placeholder={t('recipeBook.manual.dishTitlePlaceholder')}
                value={manualTitle}
                onChange={e => setManualTitle(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">{t('recipeBook.manual.prepTimeLabel')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={manualPrepTime}
                  onChange={e => setManualPrepTime(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('recipeBook.manual.servingsLabel')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={manualServings}
                  onChange={e => setManualServings(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
              {t('recipeBook.manual.submit')}
            </button>
          </form>
        </div>
      )}

      {/* COOKING MODE MODAL */}
      {cookingRecipe && (
        <CookingModeModal
          recipe={cookingRecipe}
          onClose={() => setCookingRecipe(null)}
        />
      )}
    </div>
  );
}
