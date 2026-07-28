import React, { useState } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { UtensilsCrossed, ShoppingBag, Edit3, BookOpen, Trash2, X } from 'lucide-react';
import RecipeBook from './RecipeBook';
import { recipeShareTargetFromUrl } from '../../../shared/recipeShareTarget.js';

const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

export default function MealPlanner() {
  const {
    meals,
    updateMeal,
    deleteMeal,
    addMealIngredientsToShopping,
    savedRecipes,
    activeHousehold
  } = useFamily();
  const [subTab, setSubTab] = useState(() =>
    recipeShareTargetFromUrl(window.location.href).isShareTarget
      ? 'recipes'
      : 'plan'
  ); // 'plan' or 'recipes'
  
  // Quick Pick Modal
  const [selectedMealSlot, setSelectedMealSlot] = useState(null); // { day, meal }
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [customRecipeTitle, setCustomRecipeTitle] = useState('');
  const [customIngredientsText, setCustomIngredientsText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleStartEditSlot = (day, mealType, existingMeal) => {
    setSelectedMealSlot({ day, meal: mealType, id: existingMeal?.id || '' });
    setCustomRecipeTitle(existingMeal?.recipe || '');
    setCustomIngredientsText((existingMeal?.ingredients || []).join(', '));
    setSelectedRecipeId('');
  };

  const handleSaveMealSlot = async (e) => {
    e.preventDefault();
    if (!selectedMealSlot) return;

    let finalTitle = customRecipeTitle;
    let finalIngredients = customIngredientsText.split(',').map(s => s.trim()).filter(Boolean);

    // If recipe selected from dropdown
    if (selectedRecipeId) {
      const found = savedRecipes.find(r => r.id === selectedRecipeId);
      if (found) {
        finalTitle = found.title;
        finalIngredients = found.ingredients || [];
      }
    }

    setSaving(true);
    const saved = await updateMeal(
      selectedMealSlot.day,
      selectedMealSlot.meal,
      finalTitle.trim(),
      finalIngredients
    );
    setSaving(false);
    if (saved) setSelectedMealSlot(null);
  };

  const handleAddAllToShopping = async ingredientsList => {
    await addMealIngredientsToShopping(ingredientsList);
  };

  const handleDeleteMeal = async () => {
    if (!selectedMealSlot?.id) return;
    setSaving(true);
    const deleted = await deleteMeal(selectedMealSlot.id);
    setSaving(false);
    if (deleted) setSelectedMealSlot(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Sub-navigation bar */}
      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={`btn-secondary ${subTab === 'plan' ? 'btn-primary' : ''}`}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => setSubTab('plan')}
          >
            <UtensilsCrossed size={18} /> Wochen-Speiseplan ({activeHousehold === 'familie' ? 'Unser Zuhause' : 'Oma & Opa'})
          </button>
          <button
            className={`btn-secondary ${subTab === 'recipes' ? 'btn-primary' : ''}`}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => setSubTab('recipes')}
          >
            <BookOpen size={18} /> Rezeptbuch ({savedRecipes.length})
          </button>
        </div>
      </div>

      {subTab === 'recipes' ? (
        <RecipeBook />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: 20 }}>
            <h2 className="card-title" style={{ color: '#d97706', marginBottom: 6 }}>
              <UtensilsCrossed size={24} /> Wochen-Speiseplan
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Plant eure Gerichte für die Woche. Klicke auf ein Essen, um Rezepte auszuwählen oder Zutaten mit 1 Klick auf die Einkaufsliste zu setzen!
            </p>
          </div>

          {/* Weekly Grid (Montag - Sonntag) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {DAYS.map(dayName => {
              const dayMeals = meals.filter(m => m.day === dayName && (m.household || 'familie') === activeHousehold);
              const mittag = dayMeals.find(m => m.meal === 'Mittagessen');
              const abend = dayMeals.find(m => m.meal === 'Abendessen');

              return (
                <div key={dayName} className="card" style={{ padding: 18 }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, borderBottom: '2px solid var(--border-color)', paddingBottom: 8, marginBottom: 14, color: 'var(--primary)' }}>
                    📅 {dayName}
                  </div>

                  {/* Mittagessen */}
                  <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)', marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        ☀️ Mittagessen
                      </span>
                      <button
                        className="icon-circle-btn"
                        style={{ width: 26, height: 26 }}
                        onClick={() => handleStartEditSlot(dayName, 'Mittagessen', mittag)}
                        aria-label={`${dayName} Mittagessen bearbeiten`}
                      >
                        <Edit3 size={13} />
                      </button>
                    </div>

                    {mittag?.recipe ? (
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>{mittag.recipe}</div>
                        {mittag.ingredients && mittag.ingredients.length > 0 && (
                          <button
                            className="btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '0.75rem', marginTop: 6, width: '100%', justifyContent: 'center' }}
                            onClick={() => handleAddAllToShopping(mittag.ingredients)}
                          >
                            <ShoppingBag size={12} /> Zutaten auf die Liste ({mittag.ingredients.length})
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', italic: 'true' }}>Kein Gericht eingetragen</div>
                    )}
                  </div>

                  {/* Abendessen */}
                  <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        🌙 Abendessen
                      </span>
                      <button
                        className="icon-circle-btn"
                        style={{ width: 26, height: 26 }}
                        onClick={() => handleStartEditSlot(dayName, 'Abendessen', abend)}
                        aria-label={`${dayName} Abendessen bearbeiten`}
                      >
                        <Edit3 size={13} />
                      </button>
                    </div>

                    {abend?.recipe ? (
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>{abend.recipe}</div>
                        {abend.ingredients && abend.ingredients.length > 0 && (
                          <button
                            className="btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '0.75rem', marginTop: 6, width: '100%', justifyContent: 'center' }}
                            onClick={() => handleAddAllToShopping(abend.ingredients)}
                          >
                            <ShoppingBag size={12} /> Zutaten auf die Liste ({abend.ingredients.length})
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', italic: 'true' }}>Kein Gericht eingetragen</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* QUICK PICK MODAL */}
      {selectedMealSlot && (
        <div className="modal-backdrop" onClick={() => setSelectedMealSlot(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="card-header" style={{ marginBottom: 16 }}>
              <h2 className="card-title">
                Gericht eintragen: {selectedMealSlot.day} ({selectedMealSlot.meal})
              </h2>
              <button className="icon-circle-btn" onClick={() => setSelectedMealSlot(null)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveMealSlot}>
              {savedRecipes.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Aus deinem Rezeptbuch wählen</label>
                  <select
                    className="form-select"
                    value={selectedRecipeId}
                    onChange={e => setSelectedRecipeId(e.target.value)}
                  >
                    <option value="">-- Rezept aus Rezeptbuch auswählen --</option>
                    {savedRecipes.map(r => (
                      <option key={r.id} value={r.id}>{r.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Oder Gericht selbst eingeben</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="z. B. Pfannkuchen mit Apfelmus..."
                  value={customRecipeTitle}
                  onChange={e => setCustomRecipeTitle(e.target.value)}
                  required={!selectedRecipeId}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Zutaten (kommagetrennt für Einkaufsliste)</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="z. B. 500g Mehl, 4 Eier, 1L Milch..."
                  value={customIngredientsText}
                  onChange={e => setCustomIngredientsText(e.target.value)}
                />
              </div>

              <div className="meal-modal-actions">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Speichert …' : 'Speichern'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setSelectedMealSlot(null)}>
                  Abbrechen
                </button>
                {selectedMealSlot.id && (
                  <button
                    type="button"
                    className="meal-delete-button"
                    onClick={handleDeleteMeal}
                    disabled={saving}
                  >
                    <Trash2 size={16} /> Eintrag entfernen
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
