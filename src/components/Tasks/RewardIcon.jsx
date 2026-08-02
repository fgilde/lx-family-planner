import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bike,
  BookOpen,
  CakeSlice,
  Clapperboard,
  Crown,
  Gamepad2,
  Gift,
  Headphones,
  IceCreamBowl,
  Palette,
  PartyPopper,
  PawPrint,
  Pizza,
  Popcorn,
  Rocket,
  Sparkles,
  TentTree,
  Ticket,
  Trophy,
  Waves
} from 'lucide-react';

export const REWARD_ICON_PRESETS = [
  { id: 'gift', labelKey: 'presets.gift', icon: Gift, tone: '#d4576d' },
  { id: 'ice-cream', labelKey: 'presets.iceCream', icon: IceCreamBowl, tone: '#c45e84' },
  { id: 'gaming', labelKey: 'presets.gaming', icon: Gamepad2, tone: '#5268bd' },
  { id: 'movie', labelKey: 'presets.movie', icon: Clapperboard, tone: '#635c75' },
  { id: 'popcorn', labelKey: 'presets.popcorn', icon: Popcorn, tone: '#c77820' },
  { id: 'pizza', labelKey: 'presets.pizza', icon: Pizza, tone: '#ce5b39' },
  { id: 'trip', labelKey: 'presets.trip', icon: Ticket, tone: '#287b75' },
  { id: 'outdoors', labelKey: 'presets.outdoors', icon: TentTree, tone: '#3f7a4b' },
  { id: 'bike', labelKey: 'presets.bike', icon: Bike, tone: '#277b91' },
  { id: 'swimming', labelKey: 'presets.swimming', icon: Waves, tone: '#287bad' },
  { id: 'creative', labelKey: 'presets.creative', icon: Palette, tone: '#b1508d' },
  { id: 'music', labelKey: 'presets.music', icon: Headphones, tone: '#7457a8' },
  { id: 'book', labelKey: 'presets.book', icon: BookOpen, tone: '#8a613f' },
  { id: 'party', labelKey: 'presets.party', icon: PartyPopper, tone: '#cb6b28' },
  { id: 'animal', labelKey: 'presets.animal', icon: PawPrint, tone: '#6c7440' },
  { id: 'cake', labelKey: 'presets.cake', icon: CakeSlice, tone: '#c05b75' },
  { id: 'rocket', labelKey: 'presets.rocket', icon: Rocket, tone: '#456db0' },
  { id: 'trophy', labelKey: 'presets.trophy', icon: Trophy, tone: '#b77818' },
  { id: 'crown', labelKey: 'presets.crown', icon: Crown, tone: '#a86e18' },
  { id: 'surprise', labelKey: 'presets.surprise', icon: Sparkles, tone: '#a14d85' }
];

const PRESETS_BY_VALUE = new Map(
  REWARD_ICON_PRESETS.map(preset => [`preset:${preset.id}`, preset])
);

export const DEFAULT_REWARD_ICON = 'preset:gift';

export function rewardIconLabel(value, hasImage = false, t) {
  if (hasImage) return t('rewardIcon.customImage');
  const preset = PRESETS_BY_VALUE.get(value);
  return preset ? t(preset.labelKey) : t('rewardIcon.customSymbol');
}

export default function RewardIcon({
  value = DEFAULT_REWARD_ICON,
  image = '',
  label,
  size = 'medium',
  className = ''
}) {
  const { t } = useTranslation('tasks');
  const preset = PRESETS_BY_VALUE.get(value);
  const classes = `reward-icon-display ${size} ${className}`.trim();
  const resolvedLabel = label ?? t('rewardIcon.defaultLabel');

  if (image) {
    return (
      <span
        className={`${classes} custom`}
        title={t('rewardIcon.customImageTitle', { label: resolvedLabel })}
      >
        <img src={image} alt="" />
      </span>
    );
  }

  if (preset) {
    const Icon = preset.icon;
    return (
      <span
        className={`${classes} preset`}
        style={{ '--reward-icon-tone': preset.tone }}
        title={t(preset.labelKey)}
        aria-label={t(preset.labelKey)}
      >
        <Icon aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      className={`${classes} legacy`}
      title={resolvedLabel}
      aria-label={resolvedLabel}
    >
      {value || '🎁'}
    </span>
  );
}
