import React from 'react';
import { ArrowUpRight, Coffee, Github, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  GITHUB_SPONSORS_URL,
  isGitHubSponsorsVisible
} from '../constants/project';

export default function ProjectSupportCard({ variant = 'settings' }) {
  const { t } = useTranslation('common');

  if (!isGitHubSponsorsVisible()) return null;

  return (
    <a
      className={`project-support-card project-support-card--${variant}`}
      href={GITHUB_SPONSORS_URL}
      target="_blank"
      rel="noreferrer"
      aria-label={t('projectSupport.aria')}
    >
      <span className="project-support-icon" aria-hidden="true">
        <Coffee size={21} />
        <Heart className="project-support-heart" size={10} fill="currentColor" />
      </span>
      <span className="project-support-copy">
        <small>{t('projectSupport.kicker')}</small>
        <strong>{t('projectSupport.title')}</strong>
        <span>{t('projectSupport.description')}</span>
      </span>
      <span className="project-support-action">
        <Github size={15} />
        {t('projectSupport.action')}
        <ArrowUpRight size={14} />
      </span>
    </a>
  );
}
