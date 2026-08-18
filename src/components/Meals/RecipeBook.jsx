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
  CheckCircle2,
  FileArchive,
  Pencil,
  ShieldCheck,
  Sparkles,
  Camera,
  ImagePlus,
  LoaderCircle,
  X
} from 'lucide-react';
import { recipeShareTargetFromUrl } from '../../../shared/recipeShareTarget.js';
import { parseRtkExport } from '../../../shared/rtkImport.js';
import { parseTandoorExport } from '../../../shared/tandoorImport.js';
import { buildApiUrl, plannerApiRequest } from '../../utils/apiConfig.js';
import {
  clearNativeRecipeShareRequest,
  clearPendingNativeRecipeShare,
  hasNativeRecipeShareRequest,
  readPendingNativeRecipeShare
} from '../../utils/nativeRecipeShare.js';

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
      src={buildApiUrl(src)}
      alt={alt}
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
}

export default function RecipeBook() {
  const { t } = useTranslation('meals');
  const {
    savedRecipes,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    addMealIngredientsToShopping,
    showToast
  } = useFamily();
  const initialShareTarget = useRef(
    recipeShareTargetFromUrl(window.location.href)
  );
  const initialNativeShare = useRef(
    hasNativeRecipeShareRequest(window.location.href)
  );
  const shareImportStarted = useRef(false);
  const nativeShareImportStarted = useRef(false);

  const [activeTab, setActiveTab] = useState(
    initialShareTarget.current.isShareTarget || initialNativeShare.current
      ? 'import'
      : 'browse'
  ); // 'browse', 'import', 'manual'
  const [cookingRecipe, setCookingRecipe] = useState(null);

  // Import State
  const [urlInput, setUrlInput] = useState(
    initialShareTarget.current.url
  );
  const [sharedTextInput, setSharedTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sharedImport, setSharedImport] = useState(
    initialShareTarget.current.isShareTarget || initialNativeShare.current
  );

  // Manual Form State
  const [manualTitle, setManualTitle] = useState('');
  const [manualPrepTime, setManualPrepTime] = useState('30 Min');
  const [manualServings, setManualServings] = useState('4 Portionen');
  const [manualImage, setManualImage] = useState('');
  const [manualIngredients, setManualIngredients] = useState(['']);
  const [manualInstructions, setManualInstructions] = useState(['']);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [importDraft, setImportDraft] = useState(null);
  const [tandoorLoading, setTandoorLoading] = useState(false);
  const [rtkLoading, setRtkLoading] = useState(false);
  const [manualImageUploading, setManualImageUploading] = useState(false);
  const tandoorFileInput = useRef(null);
  const rtkFileInput = useRef(null);
  const manualImageInput = useRef(null);
  const manualCameraInput = useRef(null);

  const openImportedRecipeDraft = data => {
    const recipe = data.recipe || {};
    setEditingRecipe(null);
    setImportDraft({
      platform: data.platform || 'web',
      sourceUrl: recipe.sourceUrl || '',
      warnings: Array.isArray(data.warnings) ? data.warnings : []
    });
    setManualTitle(recipe.title || '');
    setManualPrepTime(recipe.prepTime || recipe.totalTime || '');
    setManualServings(recipe.servings || '');
    setManualImage(recipe.image || '');
    setManualIngredients(
      recipe.ingredients?.length ? recipe.ingredients : ['']
    );
    setManualInstructions(
      recipe.instructions?.length ? recipe.instructions : ['']
    );
    setActiveTab('manual');
  };

  const importRecipeUrl = async (rawUrl, sharePayload = {}) => {
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
        body: JSON.stringify({
          url: targetUrl,
          sharedTitle: sharePayload.title || '',
          sharedText: sharePayload.text || ''
        })
      });
      if (data.error) {
        throw new Error(data.error || t('recipeBook.errors.importFailed'));
      }

      if (data.reviewRequired) {
        openImportedRecipeDraft(data);
        setUrlInput('');
        setSharedTextInput('');
        setSharedImport(false);
        showToast(
          t('recipeBook.toasts.draftReadyTitle'),
          t('recipeBook.toasts.draftReadyBody'),
          'info'
        );
        return data.recipe;
      }

      const saved = await addRecipe(data.recipe);
      if (!saved) {
        throw new Error(t('recipeBook.errors.saveFailed'));
      }
      setUrlInput('');
      setSharedTextInput('');
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

  const importSharedRecipeText = async sharePayload => {
    setLoading(true);
    setError(null);
    try {
      const data = await plannerApiRequest('/api/recipes/import-shared', {
        method: 'POST',
        body: JSON.stringify({
          sharedTitle: sharePayload.title || '',
          sharedText: sharePayload.text || ''
        })
      });
      if (data.error) throw new Error(data.error);
      openImportedRecipeDraft(data);
      setSharedImport(false);
      showToast(
        t('recipeBook.toasts.draftReadyTitle'),
        t('recipeBook.toasts.draftReadyBody'),
        'info'
      );
      return data.recipe;
    } catch (sharedError) {
      setError(sharedError.message);
      showToast(
        t('recipeBook.toasts.importErrorTitle'),
        sharedError.message,
        'error'
      );
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Handle public recipe pages and recipe-rich Pinterest pins.
  const handleImportUrl = async (e) => {
    e.preventDefault();
    await importRecipeUrl(urlInput, { text: sharedTextInput });
  };

  useEffect(() => {
    const payload = initialShareTarget.current;
    if (!payload.isShareTarget || shareImportStarted.current) return;
    shareImportStarted.current = true;
    window.history.replaceState({}, '', '/?view=meals');
    if (!payload.url && !payload.text && !payload.title) {
      setError(t('recipeBook.errors.shareMissingLink'));
      return;
    }
    if (payload.url) {
      void importRecipeUrl(payload.url, {
        title: payload.title,
        text: payload.text
      });
    } else {
      void importSharedRecipeText(payload);
    }
  }, []);

  const resetRecipeEditor = () => {
    setManualTitle('');
    setManualPrepTime('30 Min');
    setManualServings('4 Portionen');
    setManualImage('');
    setManualIngredients(['']);
    setManualInstructions(['']);
    setEditingRecipe(null);
    setImportDraft(null);
  };

  const openCreateRecipe = () => {
    resetRecipeEditor();
    setActiveTab('manual');
  };

  const uploadManualRecipeImage = async file => {
    if (!file || manualImageUploading) return;
    setManualImageUploading(true);
    try {
      const result = await plannerApiRequest('/api/recipes/images', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-LX-File-Name': encodeURIComponent(file.name || 'rezeptbild')
        },
        body: await file.arrayBuffer()
      });
      setManualImage(result.image || '');
      showToast(
        t('recipeBook.manual.imageSavedTitle'),
        t('recipeBook.manual.imageSavedBody'),
        'success'
      );
    } catch (uploadError) {
      showToast(
        t('recipeBook.manual.imageUploadFailedTitle'),
        uploadError?.message || t('recipeBook.manual.imageUploadFailedBody'),
        'error'
      );
    } finally {
      setManualImageUploading(false);
    }
  };

  const handleManualImageSelection = event => {
    const [file] = Array.from(event.target.files || []);
    event.target.value = '';
    void uploadManualRecipeImage(file);
  };

  const openEditRecipe = recipe => {
    setEditingRecipe(recipe);
    setImportDraft(null);
    setManualTitle(recipe.title || recipe.name || '');
    setManualPrepTime(recipe.prepTime || '');
    setManualServings(recipe.servings || '');
    setManualImage(recipe.image || '');
    setManualIngredients(
      recipe.ingredients?.length ? recipe.ingredients : ['']
    );
    setManualInstructions(
      recipe.instructions?.length ? recipe.instructions : ['']
    );
    setActiveTab('manual');
  };

  const updateListItem = (setter, index, value) => {
    setter(previous => previous.map(
      (item, itemIndex) => itemIndex === index ? value : item
    ));
  };

  const removeListItem = (setter, index) => {
    setter(previous => {
      const next = previous.filter((_, itemIndex) => itemIndex !== index);
      return next.length ? next : [''];
    });
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    const recipe = {
      title: manualTitle.trim(),
      prepTime: manualPrepTime,
      servings: manualServings,
      image: manualImage,
      ingredients: manualIngredients.map(value => value.trim()).filter(Boolean),
      instructions: manualInstructions.map(value => value.trim()).filter(Boolean),
      ...(importDraft
        ? {
            sourceUrl: importDraft.sourceUrl || '',
            source: importDraft.platform === 'facebook'
              ? 'facebook-reel'
              : importDraft.platform === 'shared-recipe'
                ? 'shared-recipe'
                : 'recipe-import'
          }
        : {})
    };
    const saved = editingRecipe
      ? await updateRecipe(editingRecipe.id, recipe)
      : await addRecipe(recipe);
    if (!saved) return;

    resetRecipeEditor();
    setActiveTab('browse');
  };

  const handleTandoorFile = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 120 * 1024 * 1024) {
      showToast(
        t('recipeBook.toasts.tandoorErrorTitle'),
        t('recipeBook.errors.tandoorTooLarge'),
        'error'
      );
      return;
    }
    setTandoorLoading(true);
    try {
      const recipes = parseTandoorExport(
        new Uint8Array(await file.arrayBuffer()),
        file.name
      );
      if (!recipes.length) {
        throw new Error(t('recipeBook.errors.tandoorEmpty'));
      }
      let imported = 0;
      for (const recipe of recipes.slice(0, 250)) {
        if (await addRecipe(recipe)) imported += 1;
      }
      showToast(
        t('recipeBook.toasts.tandoorImportedTitle'),
        t('recipeBook.toasts.tandoorImportedBody', { count: imported }),
        'success'
      );
      setActiveTab('browse');
    } catch (importError) {
      showToast(
        t('recipeBook.toasts.tandoorErrorTitle'),
        importError.message || t('recipeBook.errors.tandoorInvalid'),
        'error'
      );
    } finally {
      setTandoorLoading(false);
    }
  };

  const importRtkBytes = async bytes => {
    if (bytes.byteLength > 120 * 1024 * 1024) {
      throw new Error(t('recipeBook.errors.rtkTooLarge'));
    }
    const recipes = parseRtkExport(bytes);
    if (!recipes.length) {
      throw new Error(t('recipeBook.errors.rtkEmpty'));
    }
    const existingByExternalId = new Map(
      savedRecipes
        .filter(recipe => recipe.sourceExternalId)
        .map(recipe => [recipe.sourceExternalId, recipe])
    );
    const recoveredImages = new Map();
    const previewCandidates = recipes
      .filter(recipe => !recipe.image && recipe.sourceUrl)
      .slice(0, 30);
    for (let index = 0; index < previewCandidates.length; index += 3) {
      const batch = previewCandidates.slice(index, index + 3);
      await Promise.all(batch.map(async recipe => {
        try {
          const preview = await plannerApiRequest(
            '/api/recipes/preview-image',
            {
              method: 'POST',
              body: JSON.stringify({ url: recipe.sourceUrl })
            }
          );
          if (preview?.image) recoveredImages.set(recipe, preview.image);
        } catch {
          // A missing or blocked preview must not prevent the recipe import.
        }
      }));
    }
    let imported = 0;
    let skipped = 0;
    let imagesRecovered = 0;
    for (const recipe of recipes) {
      const existing = recipe.sourceExternalId
        ? existingByExternalId.get(recipe.sourceExternalId)
        : null;
      if (existing) {
        const recoveredImage = recoveredImages.get(recipe);
        if (!existing.image && recoveredImage) {
          if (await updateRecipe(existing.id, { image: recoveredImage })) {
            imagesRecovered += 1;
          }
        }
        skipped += 1;
        continue;
      }
      const recipeToSave = recoveredImages.has(recipe)
        ? { ...recipe, image: recoveredImages.get(recipe) }
        : recipe;
      if (await addRecipe(recipeToSave)) {
        imported += 1;
        if (recipe.sourceExternalId) {
          existingByExternalId.set(recipe.sourceExternalId, recipeToSave);
        }
      }
    }
    showToast(
      t('recipeBook.toasts.rtkImportedTitle'),
      t('recipeBook.toasts.rtkImportedBody', {
        imported,
        skipped,
        imagesRecovered
      }),
      'success'
    );
    setActiveTab('browse');
  };

  const handleRtkFile = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 120 * 1024 * 1024) {
      showToast(
        t('recipeBook.toasts.rtkErrorTitle'),
        t('recipeBook.errors.rtkTooLarge'),
        'error'
      );
      return;
    }
    setRtkLoading(true);
    try {
      await importRtkBytes(new Uint8Array(await file.arrayBuffer()));
    } catch (importError) {
      showToast(
        t('recipeBook.toasts.rtkErrorTitle'),
        importError.message || t('recipeBook.errors.rtkInvalid'),
        'error'
      );
    } finally {
      setRtkLoading(false);
    }
  };

  useEffect(() => {
    if (
      !initialNativeShare.current ||
      nativeShareImportStarted.current
    ) {
      return;
    }
    nativeShareImportStarted.current = true;
    setRtkLoading(true);
    setActiveTab('import');
    void (async () => {
      try {
        const pending = await readPendingNativeRecipeShare();
        if (!pending?.available) {
          throw new Error(
            pending?.errorCode === 'too_large'
              ? t('recipeBook.errors.rtkTooLarge')
              : t('recipeBook.errors.rtkInvalid')
          );
        }
        if (pending.size > 120 * 1024 * 1024) {
          throw new Error(t('recipeBook.errors.rtkTooLarge'));
        }
        await importRtkBytes(pending.bytes);
      } catch (importError) {
        showToast(
          t('recipeBook.toasts.rtkErrorTitle'),
          importError.message === 'shared_recipe_unavailable'
            ? t('recipeBook.errors.rtkInvalid')
            : importError.message || t('recipeBook.errors.rtkInvalid'),
          'error'
        );
      } finally {
        try {
          await clearPendingNativeRecipeShare();
        } catch {
          // The import result remains valid if Android cache cleanup fails.
        }
        clearNativeRecipeShareRequest();
        setSharedImport(false);
        setRtkLoading(false);
      }
    })();
  }, []);

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
            onClick={openCreateRecipe}
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
                <div className="recipe-card-actions">
                  <button
                    className="icon-circle-btn"
                    onClick={() => openEditRecipe(recipe)}
                    title={t('recipeBook.card.editTitle')}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="icon-circle-btn danger"
                    onClick={() => deleteRecipe(recipe.id)}
                    title={t('recipeBook.card.deleteTitle')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
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
                <strong>
                  {t(
                    initialNativeShare.current
                      ? 'recipeBook.import.shareRtkArrivalTitle'
                      : 'recipeBook.import.shareArrivalTitle'
                  )}
                </strong>
                <small>
                  {t(
                    initialNativeShare.current
                      ? 'recipeBook.import.shareRtkArrivalBody'
                      : 'recipeBook.import.shareArrivalBody'
                  )}
                </small>
              </div>
              {loading || rtkLoading
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
            <span className="facebook">Facebook Reels</span>
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

            <details className="recipe-social-caption">
              <summary>
                <span>{t('recipeBook.import.socialTextTitle')}</span>
                <small>{t('recipeBook.import.socialTextSummary')}</small>
              </summary>
              <label className="form-label" htmlFor="recipe-social-caption-text">
                {t('recipeBook.import.socialTextLabel')}
              </label>
              <textarea
                id="recipe-social-caption-text"
                className="form-textarea"
                rows="6"
                maxLength="8000"
                placeholder={t('recipeBook.import.socialTextPlaceholder')}
                value={sharedTextInput}
                onChange={event => setSharedTextInput(event.target.value)}
              />
              <small>{t('recipeBook.import.socialTextHint')}</small>
            </details>

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

          <div className="tandoor-import-panel">
            <span className="tandoor-import-icon"><FileArchive size={22} /></span>
            <div>
              <strong>{t('recipeBook.tandoor.title')}</strong>
              <p>{t('recipeBook.tandoor.description')}</p>
              <small>{t('recipeBook.tandoor.hint')}</small>
            </div>
            <input
              ref={tandoorFileInput}
              type="file"
              accept=".zip,.json,application/zip,application/json"
              hidden
              onChange={handleTandoorFile}
            />
            <button
              type="button"
              className="btn-secondary"
              disabled={tandoorLoading}
              onClick={() => tandoorFileInput.current?.click()}
            >
              <FileArchive size={16} />
              {tandoorLoading
                ? t('recipeBook.tandoor.loading')
                : t('recipeBook.tandoor.select')}
            </button>
          </div>

          <div className="tandoor-import-panel rtk-import-panel">
            <span className="tandoor-import-icon"><BookOpen size={22} /></span>
            <div>
              <strong>{t('recipeBook.rtk.title')}</strong>
              <p>{t('recipeBook.rtk.description')}</p>
              <small>{t('recipeBook.rtk.hint')}</small>
            </div>
            <input
              ref={rtkFileInput}
              type="file"
              accept=".rtk,application/zip,application/octet-stream"
              hidden
              onChange={handleRtkFile}
            />
            <button
              type="button"
              className="btn-secondary"
              disabled={rtkLoading}
              onClick={() => rtkFileInput.current?.click()}
            >
              <FileArchive size={16} />
              {rtkLoading
                ? t('recipeBook.rtk.loading')
                : t('recipeBook.rtk.select')}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: MANUAL RECIPE FORM */}
      {activeTab === 'manual' && (
        <div className={`card recipe-editor-card ${importDraft ? 'is-import-review' : ''}`}>
          {importDraft && (
            <section className="recipe-import-review" aria-labelledby="recipe-import-review-title">
              <span className="recipe-import-review-mark">
                <Sparkles size={22} />
              </span>
              <div>
                <span className="recipe-import-review-kicker">
                  {importDraft.platform === 'facebook'
                    ? t('recipeBook.review.facebookKicker')
                    : importDraft.platform === 'shared-recipe'
                      ? t('recipeBook.review.sharedKicker')
                    : t('recipeBook.review.kicker')}
                </span>
                <h3 id="recipe-import-review-title">
                  {t('recipeBook.review.title')}
                </h3>
                <p>
                  {importDraft.platform === 'shared-recipe'
                    ? t('recipeBook.review.sharedDescription')
                    : t('recipeBook.review.description')}
                </p>
                {importDraft.warnings.length > 0 && (
                  <ul>
                    {importDraft.warnings.map(warning => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                )}
              </div>
              <span className="recipe-import-review-safe">
                <ShieldCheck size={16} />
                {t('recipeBook.review.notSaved')}
              </span>
            </section>
          )}
          <div className="recipe-editor-heading">
            <div>
              <span>{importDraft
                ? t('recipeBook.review.editorKicker')
                : t('recipeBook.manual.kicker')}</span>
              <h3>{editingRecipe
                ? t('recipeBook.manual.editTitle')
                : importDraft
                  ? t('recipeBook.review.editorTitle')
                  : t('recipeBook.manual.title')}</h3>
            </div>
            {(editingRecipe || importDraft) && (
              <button type="button" className="icon-circle-btn" onClick={openCreateRecipe}>
                <X size={17} />
              </button>
            )}
          </div>
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

            <div className="form-group recipe-image-source">
              <label className="form-label">{t('recipeBook.manual.imageLabel')}</label>
              <input
                type="url"
                className="form-input"
                placeholder={t('recipeBook.manual.imagePlaceholder')}
                value={manualImage}
                onChange={event => setManualImage(event.target.value)}
              />
              <p>{t('recipeBook.manual.imageHint')}</p>
              <div className="recipe-image-source-actions">
                <input
                  ref={manualImageInput}
                  className="visually-hidden"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,image/avif"
                  onChange={handleManualImageSelection}
                />
                <input
                  ref={manualCameraInput}
                  className="visually-hidden"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleManualImageSelection}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={manualImageUploading}
                  onClick={() => manualImageInput.current?.click()}
                >
                  <ImagePlus size={16} /> {t('recipeBook.manual.chooseImage')}
                </button>
                <button
                  type="button"
                  className="btn-secondary recipe-camera-button"
                  disabled={manualImageUploading}
                  onClick={() => manualCameraInput.current?.click()}
                >
                  {manualImageUploading
                    ? <LoaderCircle className="spin" size={16} />
                    : <Camera size={16} />}
                  {manualImageUploading
                    ? t('recipeBook.manual.imageUploading')
                    : t('recipeBook.manual.takePhoto')}
                </button>
              </div>
              {manualImage && (
                <div className="recipe-image-source-preview">
                  <RecipeImage
                    src={manualImage}
                    alt={t('recipeBook.manual.imagePreviewAlt', {
                      title: manualTitle || t('recipeBook.manual.dishTitleLabel')
                    })}
                  />
                  <button
                    type="button"
                    className="icon-circle-btn"
                    onClick={() => setManualImage('')}
                    aria-label={t('recipeBook.manual.removeImage')}
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
            </div>

            <div className="recipe-editor-section">
              <div className="recipe-editor-section-title">
                <strong>{t('recipeBook.manual.ingredientsLabel')}</strong>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setManualIngredients(previous => [...previous, ''])}
                >
                  <Plus size={14} /> {t('recipeBook.manual.addIngredient')}
                </button>
              </div>
              <div className="recipe-editor-list">
                {manualIngredients.map((ingredient, index) => (
                  <div key={`ingredient-${index}`}>
                    <span>{index + 1}</span>
                    <input
                      type="text"
                      className="form-input"
                      value={ingredient}
                      placeholder={t('recipeBook.manual.ingredientPlaceholder')}
                      onChange={event => updateListItem(
                        setManualIngredients,
                        index,
                        event.target.value
                      )}
                    />
                    <button
                      type="button"
                      className="icon-circle-btn"
                      onClick={() => removeListItem(setManualIngredients, index)}
                      aria-label={t('recipeBook.manual.removeIngredient')}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="recipe-editor-section">
              <div className="recipe-editor-section-title">
                <strong>{t('recipeBook.manual.instructionsLabel')}</strong>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setManualInstructions(previous => [...previous, ''])}
                >
                  <Plus size={14} /> {t('recipeBook.manual.addStep')}
                </button>
              </div>
              <div className="recipe-editor-list steps">
                {manualInstructions.map((instruction, index) => (
                  <div key={`instruction-${index}`}>
                    <span>{index + 1}</span>
                    <textarea
                      className="form-textarea"
                      rows="3"
                      value={instruction}
                      placeholder={t('recipeBook.manual.stepPlaceholder')}
                      onChange={event => updateListItem(
                        setManualInstructions,
                        index,
                        event.target.value
                      )}
                    />
                    <button
                      type="button"
                      className="icon-circle-btn"
                      onClick={() => removeListItem(setManualInstructions, index)}
                      aria-label={t('recipeBook.manual.removeStep')}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
              {editingRecipe
                ? t('recipeBook.manual.saveChanges')
                : importDraft
                  ? t('recipeBook.review.saveReviewed')
                  : t('recipeBook.manual.submit')}
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
