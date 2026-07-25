import React, { useState } from 'react';
import { useFamily } from '../../context/FamilyContext';
import CookingModeModal from './CookingModeModal';
import { BookOpen, Plus, Download, Trash2, Clock, Users, Play, ChefHat, Sparkles, AlertCircle, ImageOff, ShoppingBag } from 'lucide-react';

function RecipeImage({ src, alt }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="recipe-image-fallback" role="img" aria-label={`${alt} ohne Bild`}>
        <ImageOff size={28} />
        <span>Rezeptbild nicht verfügbar</span>
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
  const { savedRecipes, addRecipe, deleteRecipe, addMealIngredientsToShopping, showToast } = useFamily();

  const [activeTab, setActiveTab] = useState('browse'); // 'browse', 'import', 'manual'
  const [cookingRecipe, setCookingRecipe] = useState(null);

  // Import State
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Manual Form State
  const [manualTitle, setManualTitle] = useState('');
  const [manualPrepTime, setManualPrepTime] = useState('30 Min');
  const [manualServings, setManualServings] = useState('4 Portionen');
  const [manualImage, setManualImage] = useState('');

  // Handle Web Recipe Import (Chefkoch.de, Lecker.de, etc.)
  const handleImportUrl = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    let targetUrl = urlInput.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/recipes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Rezept konnte nicht importiert werden.');
      }

      await addRecipe(data.recipe);
      setUrlInput('');
      setActiveTab('browse');
      showToast('🎉 Rezept importiert!', `"${data.recipe.title}" wurde erfolgreich importiert!`, 'success');
    } catch (err) {
      setError(err.message);
      showToast('⚠️ Import-Fehler', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    addRecipe({
      title: manualTitle,
      prepTime: manualPrepTime,
      servings: manualServings,
      image: manualImage || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=600&q=80',
      ingredients: ['1x Zutat 1', '2x Zutat 2'],
      instructions: ['Zubereitungsschritt 1', 'Zubereitungsschritt 2']
    });

    setManualTitle('');
    setActiveTab('browse');
    showToast('✨ Rezept erstellt', `"${manualTitle}" wurde im Rezeptbuch gespeichert.`, 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header Bar */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen style={{ color: 'var(--primary)' }} /> Unser Kochbuch & Rezeptwelt
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Rezepte von Chefkoch importieren, eigene Familienrezepte speichern & Schritt-für-Schritt kochen.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn-secondary ${activeTab === 'browse' ? 'active' : ''}`}
            onClick={() => setActiveTab('browse')}
          >
            Alle Rezepte ({savedRecipes.length})
          </button>
          <button
            className={`btn-secondary ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => setActiveTab('import')}
            style={{ color: '#059669', borderColor: '#059669' }}
          >
            <Download size={16} /> Chefkoch Import
          </button>
          <button
            className={`btn-primary ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            <Plus size={16} /> Neues Rezept
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
                  title="Rezept löschen"
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
                      <Clock size={14} /> {recipe.prepTime || '30 Min'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={14} /> {recipe.servings || '4 Portionen'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: 'center', padding: '8px 12px', fontSize: '0.85rem' }}
                    onClick={() => setCookingRecipe(recipe)}
                  >
                    <Play size={15} /> Kochen Starten
                  </button>

                  <button
                    className="btn-secondary"
                    style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                    onClick={() => addMealIngredientsToShopping(recipe.ingredients || [])}
                    title="Zutaten auf die Einkaufsliste setzen"
                  >
                    <ShoppingBag size={15} /> Zutaten auf die Liste
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: CHEFKOCH / WEB IMPORT */}
      {activeTab === 'import' && (
        <div className="card" style={{ maxWidth: 640, margin: '0 auto', width: '100%', padding: 28 }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Download style={{ color: '#059669' }} /> Rezept von Chefkoch.de importieren
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 18 }}>
            Füge einfach den Link einer Chefkoch-Rezeptseite ein. Die Zutaten, Zeiten & Schritte werden automatisch extrahiert!
          </p>

          <form onSubmit={handleImportUrl}>
            <div className="form-group">
              <label className="form-label">Chefkoch Rezept-URL</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://www.chefkoch.de/rezepte/..."
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
              {loading ? 'Wird analysiert & importiert...' : 'Rezept jetzt Importieren'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: MANUAL RECIPE FORM */}
      {activeTab === 'manual' && (
        <div className="card" style={{ maxWidth: 640, margin: '0 auto', width: '100%', padding: 28 }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 16 }}>Eigenes Rezept anlegen</h3>
          <form onSubmit={handleManualSubmit}>
            <div className="form-group">
              <label className="form-label">Titel des Gerichts</label>
              <input
                type="text"
                className="form-input"
                placeholder="z. B. Papas berühmte Bolognese"
                value={manualTitle}
                onChange={e => setManualTitle(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Zubereitungszeit</label>
                <input
                  type="text"
                  className="form-input"
                  value={manualPrepTime}
                  onChange={e => setManualPrepTime(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Portionen</label>
                <input
                  type="text"
                  className="form-input"
                  value={manualServings}
                  onChange={e => setManualServings(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
              Rezept Speichern
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
