import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('tasks');
  const fileRef = useRef(null);
  const [error, setError] = useState('');
  const selectedLabel = rewardIconLabel(value, Boolean(image), t);

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
      setError('iconPicker.errors.invalidType');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('iconPicker.errors.tooLarge');
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
        setError('iconPicker.errors.stillTooLarge');
        return;
      }
      setError('');
      onChange({
        icon: 'custom',
        iconImage: compressed
      });
    };
    reader.onerror = () => setError('iconPicker.errors.readFailed');
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
          <small>{t('iconPicker.hint')}</small>
        </span>
        <button
          type="button"
          className="reward-custom-upload"
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={16} />
          {t('rewardIcon.customImage')}
        </button>
        <input
          ref={fileRef}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label={t('iconPicker.uploadAriaLabel')}
          onChange={uploadImage}
        />
      </div>

      <div className="reward-icon-preset-grid" aria-label={t('iconPicker.presetsAriaLabel')}>
        {REWARD_ICON_PRESETS.map(preset => {
          const selected = !image && value === `preset:${preset.id}`;
          return (
            <button
              key={preset.id}
              type="button"
              className={selected ? 'selected' : ''}
              onClick={() => choosePreset(preset)}
              aria-pressed={selected}
              aria-label={t(preset.labelKey)}
              title={t(preset.labelKey)}
            >
              <RewardIcon value={`preset:${preset.id}`} label={t(preset.labelKey)} />
              <span>{t(preset.labelKey)}</span>
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
            <RewardIcon value="custom" image={image} label={t('rewardIcon.customImage')} />
          ) : (
            <span className="reward-upload-placeholder"><ImagePlus /></span>
          )}
          <span>{t('rewardIcon.customImage')}</span>
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
          <RotateCcw size={14} /> {t('iconPicker.removeCustomImage')}
        </button>
      )}
      {error && <p className="reward-icon-error" role="alert">{t(error)}</p>}
    </div>
  );
}
