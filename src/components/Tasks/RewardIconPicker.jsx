import React, { useRef, useState } from 'react';
import { ImagePlus, RotateCcw, Upload } from 'lucide-react';
import { compressImageDataUrl } from '../../utils/imageCompressor';
import RewardIcon, {
  DEFAULT_REWARD_ICON,
  REWARD_ICON_PRESETS,
  rewardIconLabel
} from './RewardIcon';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp'
]);

export default function RewardIconPicker({
  value = DEFAULT_REWARD_ICON,
  image = '',
  onChange
}) {
  const fileRef = useRef(null);
  const [error, setError] = useState('');
  const selectedLabel = rewardIconLabel(value, Boolean(image));

  const choosePreset = preset => {
    setError('');
    onChange({
      icon: `preset:${preset.id}`,
      iconImage: ''
    });
  };

  const uploadImage = event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setError('Bitte ein PNG-, JPG- oder WebP-Bild auswählen.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Das Bild darf höchstens 5 MB groß sein.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const compressed = await compressImageDataUrl(
        String(reader.result || ''),
        240,
        240,
        0.82
      );
      if (!compressed || compressed.length > 350_000) {
        setError('Das Bild ist nach dem Verkleinern noch zu groß.');
        return;
      }
      setError('');
      onChange({
        icon: 'custom',
        iconImage: compressed
      });
    };
    reader.onerror = () => setError('Das Bild konnte nicht gelesen werden.');
    reader.readAsDataURL(file);
  };

  return (
    <div className="reward-icon-picker">
      <div className="reward-icon-picker-heading">
        <RewardIcon
          value={value}
          image={image}
          label={selectedLabel}
          size="large"
        />
        <span>
          <strong>{selectedLabel}</strong>
          <small>Ein klares Bild, das Kinder sofort wiedererkennen.</small>
        </span>
        <button
          type="button"
          className="reward-custom-upload"
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={16} />
          Eigenes Bild
        </button>
        <input
          ref={fileRef}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Eigenes Belohnungsbild auswählen"
          onChange={uploadImage}
        />
      </div>

      <div className="reward-icon-preset-grid" aria-label="Belohnungs-Icons">
        {REWARD_ICON_PRESETS.map(preset => {
          const selected = !image && value === `preset:${preset.id}`;
          return (
            <button
              key={preset.id}
              type="button"
              className={selected ? 'selected' : ''}
              onClick={() => choosePreset(preset)}
              aria-pressed={selected}
              aria-label={preset.label}
              title={preset.label}
            >
              <RewardIcon value={`preset:${preset.id}`} label={preset.label} />
              <span>{preset.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          className={image ? 'selected upload-tile' : 'upload-tile'}
          onClick={() => fileRef.current?.click()}
          aria-pressed={Boolean(image)}
        >
          {image ? (
            <RewardIcon value="custom" image={image} label="Eigenes Bild" />
          ) : (
            <span className="reward-upload-placeholder"><ImagePlus /></span>
          )}
          <span>Eigenes Bild</span>
        </button>
      </div>

      {image && (
        <button
          type="button"
          className="reward-image-reset"
          onClick={() => onChange({
            icon: DEFAULT_REWARD_ICON,
            iconImage: ''
          })}
        >
          <RotateCcw size={14} /> Eigenes Bild entfernen
        </button>
      )}
      {error && <p className="reward-icon-error" role="alert">{error}</p>}
    </div>
  );
}
