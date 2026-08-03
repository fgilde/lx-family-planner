import React from 'react';
import { Check, UsersRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_MEMBER_AVATAR,
  handleImgError
} from '../../utils/imageFallback';

export default function EventAudiencePicker({
  members,
  value,
  onChange,
  disabled = false
}) {
  const { t } = useTranslation('calendar');
  const selected = Array.isArray(value) ? value : [];
  const everyone = selected.length === 0;

  const toggleMember = memberId => {
    if (disabled) return;
    if (everyone) {
      onChange([memberId]);
      return;
    }
    const next = selected.includes(memberId)
      ? selected.filter(id => id !== memberId)
      : [...selected, memberId];
    onChange(next);
  };

  return (
    <fieldset className="event-audience-picker" disabled={disabled}>
      <legend>{t('editor.audience.title')}</legend>
      <p>{t('editor.audience.hint')}</p>
      <div>
        <button
          type="button"
          className={everyone ? 'is-selected' : ''}
          aria-pressed={everyone}
          onClick={() => onChange([])}
        >
          <span className="event-audience-avatar is-family">
            <UsersRound size={18} />
          </span>
          <strong>{t('editor.audience.everyone')}</strong>
          <i>{everyone && <Check size={14} />}</i>
        </button>
        {members.map(member => {
          const isSelected = selected.includes(member.id);
          return (
            <button
              type="button"
              key={member.id}
              className={isSelected ? 'is-selected' : ''}
              aria-pressed={isSelected}
              onClick={() => toggleMember(member.id)}
              style={{ '--audience-color': member.color }}
            >
              <img
                className="event-audience-avatar"
                src={member.avatar || DEFAULT_MEMBER_AVATAR}
                alt=""
                onError={event =>
                  handleImgError(event, DEFAULT_MEMBER_AVATAR)
                }
              />
              <strong>{member.name}</strong>
              <i>{isSelected && <Check size={14} />}</i>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
