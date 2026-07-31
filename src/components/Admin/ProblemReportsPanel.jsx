import React, { useEffect, useState } from 'react';
import {
  Bug,
  Check,
  ClipboardCopy,
  Inbox,
  LoaderCircle,
  RotateCcw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../../context/FamilyContext';
import { formatDateTime } from '../../utils/formatting';

const CATEGORY_LABELS = {
  problem: 'Problem',
  content: 'Inhalt',
  idea: 'Idee'
};

export default function ProblemReportsPanel() {
  const { t } = useTranslation('admin');
  const {
    fetchProblemReports,
    updateProblemReport,
    members,
    showToast
  } = useFamily();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const categoryLabel = category =>
    CATEGORY_LABELS[category]
      ? t(`problemReports.categories.${category}`, {
          defaultValue: CATEGORY_LABELS[category]
        })
      : t('problemReports.categories.fallback');

  const load = async () => {
    setLoading(true);
    const result = await fetchProblemReports();
    if (result) setReports(result);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleStatus = async report => {
    setBusy(report.id);
    const updated = await updateProblemReport(
      report.id,
      report.status === 'open' ? 'resolved' : 'open'
    );
    setBusy('');
    if (updated) {
      setReports(previous =>
        previous.map(item => item.id === updated.id ? updated : item)
      );
    }
  };

  const copy = async report => {
    const member = members.find(item => item.id === report.memberId);
    const text = [
      `[${categoryLabel(report.category)}] ${report.title}`,
      report.description,
      t('problemReports.copy.profileLine', {
        value: member?.name || t('problemReports.unknownMember')
      }),
      t('problemReports.copy.areaLine', { value: report.page || '–' }),
      t('problemReports.copy.versionLine', { value: report.appVersion || '–' }),
      t('problemReports.copy.deviceLine', { value: report.clientInfo || '–' })
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      showToast(
        t('problemReports.copy.successTitle'),
        t('problemReports.copy.successBody'),
        'success'
      );
    } catch {
      showToast(
        t('problemReports.copy.errorTitle'),
        t('problemReports.copy.errorBody'),
        'warning'
      );
    }
  };

  const openReports = reports.filter(report => report.status === 'open');

  return (
    <section className="admin-panel problem-reports-panel">
      <header className="admin-panel-header">
        <div>
          <span className="admin-section-kicker">{t('problemReports.kicker')}</span>
          <h2><Bug size={21} /> {t('problemReports.title')}</h2>
        </div>
        <button type="button" className="admin-text-button" onClick={load}>
          {loading
            ? <LoaderCircle className="spin" size={16} />
            : <RotateCcw size={16} />}
          {t('common:actions.refresh')}
        </button>
      </header>
      <p className="admin-panel-intro">{t('problemReports.intro')}</p>
      {loading ? (
        <div className="admin-inline-empty">
          <LoaderCircle className="spin" size={18} /> {t('problemReports.loading')}
        </div>
      ) : reports.length ? (
        <div className="problem-report-list">
          {reports.slice(0, 20).map(report => {
            const member = members.find(item => item.id === report.memberId);
            return (
              <article
                key={report.id}
                className={report.status === 'resolved' ? 'resolved' : ''}
              >
                <header>
                  <span>{categoryLabel(report.category)}</span>
                  <time>
                    {formatDateTime(report.createdAt)}
                  </time>
                </header>
                <strong>{report.title}</strong>
                <p>{report.description}</p>
                <small>
                  {member?.name || t('problemReports.unknownMember')}
                  {' · '}
                  {report.page || t('problemReports.areaFallback')}
                  {' · '}v{report.appVersion}
                </small>
                <footer>
                  <button type="button" onClick={() => copy(report)}>
                    <ClipboardCopy size={14} /> {t('problemReports.copyButton')}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleStatus(report)}
                    disabled={busy === report.id}
                  >
                    {report.status === 'open'
                      ? <><Check size={14} /> {t('problemReports.markDone')}</>
                      : <><RotateCcw size={14} /> {t('problemReports.reopen')}</>}
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="admin-managed-empty">
          <Inbox size={24} />
          <span>
            <strong>{t('problemReports.empty.title')}</strong>
            <small>{t('problemReports.empty.hint')}</small>
          </span>
        </div>
      )}
      {openReports.length > 0 && (
        <span className="problem-open-count">
          {t('problemReports.openCount', { count: openReports.length })}
        </span>
      )}
    </section>
  );
}
