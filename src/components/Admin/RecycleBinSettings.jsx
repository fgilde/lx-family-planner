import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckSquare,
  ChefHat,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  ShoppingCart,
  StickyNote,
  Trash2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { plannerApiRequest } from '../../utils/apiConfig';

const TYPE_META = {
  events: { icon: CalendarDays, label: 'event' },
  tasks: { icon: CheckSquare, label: 'task' },
  notes: { icon: StickyNote, label: 'note' },
  meals: { icon: ChefHat, label: 'meal' },
  savedRecipes: { icon: ChefHat, label: 'recipe' },
  shoppingItems: { icon: ShoppingCart, label: 'shopping' },
  chatMessages: { icon: MessageCircle, label: 'message' }
};

function recordTitle(record) {
  const text = [
    record?.title,
    record?.name,
    record?.subject,
    record?.text,
    record?.message,
    record?.content,
    record?.item
  ].find(value => typeof value === 'string' && value.trim());
  return text?.trim().slice(0, 120) || '—';
}

export default function RecycleBinSettings() {
  const { t, i18n } = useTranslation('adminCloud');
  const [records, setRecords] = useState([]);
  const [retentionDays, setRetentionDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await plannerApiRequest('/api/recycle-bin');
      setRecords(Array.isArray(data.records) ? data.records : []);
      setRetentionDays(Number(data.retentionDays) || 30);
      setError('');
    } catch (loadError) {
      if (loadError?.status !== 403) setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedRecords = useMemo(
    () => [...records].sort((left, right) => right.deletedAt - left.deletedAt),
    [records]
  );

  const restore = async entry => {
    setBusy(`restore-${entry.id}`);
    setError('');
    try {
      await plannerApiRequest(`/api/recycle-bin/${entry.id}/restore`, {
        method: 'POST'
      });
      setRecords(previous => previous.filter(record => record.id !== entry.id));
    } catch (restoreError) {
      setError(restoreError.message);
    } finally {
      setBusy('');
    }
  };

  const removeForever = async entry => {
    if (!window.confirm(t('recycleBin.removeConfirm'))) return;
    setBusy(`remove-${entry.id}`);
    setError('');
    try {
      await plannerApiRequest(`/api/recycle-bin/${entry.id}`, {
        method: 'DELETE'
      });
      setRecords(previous => previous.filter(record => record.id !== entry.id));
    } catch (removeError) {
      setError(removeError.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <section className="admin-panel recycle-bin-panel">
      <header className="admin-panel-header">
        <div>
          <span className="admin-section-kicker">{t('recycleBin.kicker')}</span>
          <h2><Trash2 size={22} /> {t('recycleBin.title')}</h2>
        </div>
        <button
          type="button"
          className="btn-secondary recycle-bin-refresh"
          onClick={load}
          disabled={loading || Boolean(busy)}
          aria-label={t('recycleBin.refresh')}
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          {t('recycleBin.refresh')}
        </button>
      </header>

      <p className="admin-panel-intro">
        {t('recycleBin.intro', { days: retentionDays })}
      </p>

      {error && <p className="database-backup-error">{error}</p>}

      {loading ? (
        <p className="recycle-bin-loading"><RefreshCw size={17} className="spin" /> {t('recycleBin.loading')}</p>
      ) : !sortedRecords.length ? (
        <div className="recycle-bin-empty">
          <Trash2 size={24} />
          <div>
            <strong>{t('recycleBin.emptyTitle')}</strong>
            <p>{t('recycleBin.emptyBody')}</p>
          </div>
        </div>
      ) : (
        <div className="recycle-bin-list">
          {sortedRecords.map(entry => {
            const meta = TYPE_META[entry.type] || { icon: Trash2, label: 'entry' };
            const Icon = meta.icon;
            const disabled = Boolean(busy);
            return (
              <article key={entry.id} className="recycle-bin-record">
                <span className="recycle-bin-record-icon"><Icon size={18} /></span>
                <div className="recycle-bin-record-copy">
                  <strong>{recordTitle(entry.record)}</strong>
                  <small>
                    {t(`recycleBin.types.${meta.label}`)} · {t('recycleBin.deletedAt', {
                      date: new Date(entry.deletedAt).toLocaleString(i18n.language)
                    })}
                  </small>
                  <em>{t('recycleBin.expiresAt', {
                    date: new Date(entry.expiresAt).toLocaleDateString(i18n.language)
                  })}</em>
                </div>
                <div className="recycle-bin-record-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={disabled}
                    onClick={() => restore(entry)}
                  >
                    <RotateCcw size={15} />
                    {busy === `restore-${entry.id}`
                      ? t('recycleBin.restoring')
                      : t('recycleBin.restore')}
                  </button>
                  <button
                    type="button"
                    className="btn-quiet-danger"
                    disabled={disabled}
                    onClick={() => removeForever(entry)}
                    aria-label={t('recycleBin.removeForever')}
                    title={t('recycleBin.removeForever')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
