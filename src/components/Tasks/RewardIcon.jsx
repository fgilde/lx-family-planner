import React from 'react';
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
  { id: 'gift', label: 'Geschenk', icon: Gift, tone: '#d4576d' },
  { id: 'ice-cream', label: 'Eis essen', icon: IceCreamBowl, tone: '#c45e84' },
  { id: 'gaming', label: 'Spielzeit', icon: Gamepad2, tone: '#5268bd' },
  { id: 'movie', label: 'Filmabend', icon: Clapperboard, tone: '#635c75' },
  { id: 'popcorn', label: 'Kino', icon: Popcorn, tone: '#c77820' },
  { id: 'pizza', label: 'Pizza', icon: Pizza, tone: '#ce5b39' },
  { id: 'trip', label: 'Ausflug', icon: Ticket, tone: '#287b75' },
  { id: 'outdoors', label: 'Draußen', icon: TentTree, tone: '#3f7a4b' },
  { id: 'bike', label: 'Fahrradtour', icon: Bike, tone: '#277b91' },
  { id: 'swimming', label: 'Schwimmen', icon: Waves, tone: '#287bad' },
  { id: 'creative', label: 'Kreativzeit', icon: Palette, tone: '#b1508d' },
  { id: 'music', label: 'Musik', icon: Headphones, tone: '#7457a8' },
  { id: 'book', label: 'Buch', icon: BookOpen, tone: '#8a613f' },
  { id: 'party', label: 'Party', icon: PartyPopper, tone: '#cb6b28' },
  { id: 'animal', label: 'Tiererlebnis', icon: PawPrint, tone: '#6c7440' },
  { id: 'cake', label: 'Nascherei', icon: CakeSlice, tone: '#c05b75' },
  { id: 'rocket', label: 'Abenteuer', icon: Rocket, tone: '#456db0' },
  { id: 'trophy', label: 'Hauptgewinn', icon: Trophy, tone: '#b77818' },
  { id: 'crown', label: 'Wunsch bestimmen', icon: Crown, tone: '#a86e18' },
  { id: 'surprise', label: 'Überraschung', icon: Sparkles, tone: '#a14d85' }
];

const PRESETS_BY_VALUE = new Map(
  REWARD_ICON_PRESETS.map(preset => [`preset:${preset.id}`, preset])
);

export const DEFAULT_REWARD_ICON = 'preset:gift';

export function rewardIconLabel(value, hasImage = false) {
  if (hasImage) return 'Eigenes Bild';
  return PRESETS_BY_VALUE.get(value)?.label || 'Eigenes Symbol';
}

export default function RewardIcon({
  value = DEFAULT_REWARD_ICON,
  image = '',
  label = 'Belohnung',
  size = 'medium',
  className = ''
}) {
  const preset = PRESETS_BY_VALUE.get(value);
  const classes = `reward-icon-display ${size} ${className}`.trim();

  if (image) {
    return (
      <span className={`${classes} custom`} title={`${label}: eigenes Bild`}>
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
        title={preset.label}
        aria-label={preset.label}
      >
        <Icon aria-hidden="true" />
      </span>
    );
  }

  return (
    <span className={`${classes} legacy`} title={label} aria-label={label}>
      {value || '🎁'}
    </span>
  );
}
