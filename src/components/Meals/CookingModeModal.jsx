import React, { useState, useEffect } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { handleImgError, DEFAULT_RECIPE_IMAGE } from '../../utils/imageFallback';
import { X, Play, Pause, RotateCcw, Clock, ShoppingBag, CheckSquare, Sparkles, Heart, Users, Flame, BellRing } from 'lucide-react';

// Intelligent sentence & step splitter - completely defensive for strings, arrays, objects
function parseInstructionSteps(instructionsInput) {
  if (!instructionsInput) return ['Zutaten vorbereiten und nach Wunsch zubereiten.'];
  
  let rawText = '';
  if (Array.isArray(instructionsInput)) {
    rawText = instructionsInput.map(item => (typeof item === 'string' ? item : (item?.text || item?.name || String(item || '')))).join('\n');
  } else if (typeof instructionsInput === 'string') {
    rawText = instructionsInput;
  } else if (typeof instructionsInput === 'object' && instructionsInput.text) {
    rawText = instructionsInput.text;
  } else {
    rawText = String(instructionsInput);
  }

  const rawLines = rawText.split(/\n+/);
  const steps = [];

  rawLines.forEach(line => {
    line = line.trim();
    if (!line) return;

    // Split sentences by dot followed by space or end of string
    const sentenceParts = line.split(/(?<=[a-zA-ZäöüÄÖÜß]\.)\s+/g);
    sentenceParts.forEach(part => {
      part = part.trim();
      if (part) {
        const cleaned = part.replace(/^(\d+[\.\)]|Schritt\s*\d+:?)\s*/i, '').trim();
        if (cleaned.length > 2) {
          steps.push(cleaned);
        }
      }
    });
  });

  return steps.length > 0 ? steps : [rawText];
}

export default function CookingModeModal({ recipe, onClose }) {
  const { addMealIngredientsToShopping, showToast } = useFamily();

  if (!recipe) return null;

  // Portions State & Base Portion
  const basePortions = parseInt(recipe.servings) || 4;
  const [portions, setPortions] = useState(basePortions);

  // Completed Steps State
  const [completedSteps, setCompletedSteps] = useState([]);

  // Kitchen Timer State
  const [customTimerMinutes, setCustomTimerMinutes] = useState(10);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Parse instruction steps into an array of individual sentences
  const steps = parseInstructionSteps(recipe.instructions);

  // Scale ingredient quantities based on portion multiplier
  const portionMultiplier = portions / (basePortions || 1);

  const scaleIngredientStr = (ingStr) => {
    if (typeof ingStr !== 'string') return String(ingStr || '');
    return ingStr.replace(/(\d+(?:[.,]\d+)?)/g, (match) => {
      const num = parseFloat(match.replace(',', '.'));
      if (isNaN(num)) return match;
      const scaled = Math.round(num * portionMultiplier * 10) / 10;
      return scaled.toString().replace('.', ',');
    });
  };

  const rawIngredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients
    : typeof recipe.ingredients === 'string' ? recipe.ingredients.split('\n') : [];

  const scaledIngredients = rawIngredients.map(ing => scaleIngredientStr(ing));

  // Timer Effect
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.play();
            } catch (e) {}

            showToast('⏰ Kochen beendet!', `Der Koch-Timer für "${recipe.title}" ist abgelaufen!`, 'star');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const startTimerWithMinutes = (minutes) => {
    const mins = Number(minutes);
    if (isNaN(mins) || mins <= 0) return;
    const secs = Math.round(mins * 60);
    setTimerSeconds(secs);
    setIsTimerRunning(true);
    showToast('⏱️ Koch-Timer gestartet', `Timer auf ${mins} Minute(n) gestartet.`, 'info');
  };

  const formatTimerTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleStepCompleted = (stepIdx) => {
    if (completedSteps.includes(stepIdx)) {
      setCompletedSteps(prev => prev.filter(i => i !== stepIdx));
    } else {
      setCompletedSteps(prev => [...prev, stepIdx]);
    }
  };

  const handleAddAllToShopping = () => {
    if (scaledIngredients.length === 0) return;
    addMealIngredientsToShopping(scaledIngredients);
    showToast('🛒 Zutaten hinzugefügt', `${scaledIngredients.length} Zutaten für "${recipe.title}" stehen auf der Einkaufsliste!`, 'success');
  };

  const recipeImageUrl = typeof recipe.image === 'string' && recipe.image ? recipe.image : DEFAULT_RECIPE_IMAGE;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 300 }}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 880, width: '100%', maxHeight: '92vh' }}>
        
        {/* MODAL HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#059669', color: 'white', padding: '6px 12px', borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Flame size={16} /> Koch-Modus Aktiv
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
              {recipe.title}
            </h2>
          </div>

          <button className="icon-circle-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* RECIPE HERO IMAGE & METRICS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 20 }}>
          <div style={{ position: 'relative', height: 180, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <img
              src={recipeImageUrl}
              onError={e => handleImgError(e, DEFAULT_RECIPE_IMAGE)}
              alt={recipe.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          {/* TIMER & PORTIONS CONTROL BOX */}
          <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            
            {/* PORTION SCALER */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Users size={18} style={{ color: 'var(--primary)' }} /> Portionen anpassen:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  className="icon-circle-btn"
                  style={{ width: 32, height: 32 }}
                  onClick={() => setPortions(Math.max(1, portions - 1))}
                >
                  -
                </button>
                <span style={{ fontWeight: 900, fontSize: '1.2rem', minWidth: 28, textAlign: 'center' }}>
                  {portions}
                </span>
                <button
                  className="icon-circle-btn"
                  style={{ width: 32, height: 32 }}
                  onClick={() => setPortions(portions + 1)}
                >
                  +
                </button>
              </div>
            </div>

            {/* INTEGRATED KITCHEN TIMER */}
            <div style={{ background: 'var(--bg-card)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, color: '#d97706' }}>
                  <BellRing size={16} /> Küchen-Timer
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.4rem', color: isTimerRunning ? '#ef4444' : 'var(--text-main)' }}>
                  {formatTimerTime(timerSeconds)}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="number"
                  min="1"
                  max="120"
                  className="form-input"
                  style={{ width: 70, minHeight: 36, padding: '4px 8px', fontSize: '0.85rem' }}
                  value={customTimerMinutes}
                  onChange={e => setCustomTimerMinutes(e.target.value)}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Min</span>

                {!isTimerRunning ? (
                  <button
                    className="btn-primary"
                    style={{ flex: 1, minHeight: 36, padding: '4px 10px', fontSize: '0.85rem', justifyContent: 'center', background: '#059669' }}
                    onClick={() => startTimerWithMinutes(customTimerMinutes)}
                  >
                    <Play size={14} /> Start
                  </button>
                ) : (
                  <button
                    className="btn-secondary"
                    style={{ flex: 1, minHeight: 36, padding: '4px 10px', fontSize: '0.85rem', justifyContent: 'center', color: '#ef4444' }}
                    onClick={() => setIsTimerRunning(false)}
                  >
                    <Pause size={14} /> Stopp
                  </button>
                )}

                <button
                  className="icon-circle-btn"
                  style={{ width: 36, height: 36 }}
                  onClick={() => { setIsTimerRunning(false); setTimerSeconds(0); }}
                  title="Timer zurücksetzen"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* TWO-COLUMN WORKFLOW: INGREDIENTS & STEPS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          
          {/* COLUMN 1: INGREDIENTS LIST */}
          <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#059669' }}>
                <ShoppingBag size={20} /> Zutaten ({scaledIngredients.length})
              </h3>
              <button
                className="btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.8rem', color: '#059669', borderColor: '#059669' }}
                onClick={handleAddAllToShopping}
              >
                🛒 Auf Bring! Liste
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
              {scaledIngredients.map((ing, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '8px 12px',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <span>•</span>
                  <span>{ing}</span>
                </div>
              ))}
            </div>
          </div>

          {/* COLUMN 2: STEP-BY-STEP INSTRUCTIONS */}
          <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#2563eb' }}>
                <CheckSquare size={20} /> Schritt-für-Schritt Zubereitung
              </h3>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                {completedSteps.length} / {steps.length} erledigt
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
              {steps.map((stepText, idx) => {
                const isDone = completedSteps.includes(idx);

                return (
                  <div
                    key={idx}
                    onClick={() => toggleStepCompleted(idx)}
                    style={{
                      padding: 12,
                      background: isDone ? 'var(--bg-subtle)' : 'var(--bg-card)',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${isDone ? '#10b981' : 'var(--border-color)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      opacity: isDone ? 0.65 : 1
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: isDone ? '#10b981' : '#2563eb',
                        color: 'white', fontSize: '0.75rem', fontWeight: 900,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2
                      }}>
                        {idx + 1}
                      </span>
                      <span style={{ fontSize: '0.9rem', fontWeight: isDone ? 600 : 700, textDecoration: isDone ? 'line-through' : 'none', flex: 1 }}>
                        {stepText}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
