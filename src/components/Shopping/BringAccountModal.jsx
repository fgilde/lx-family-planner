import React, { useState } from 'react';
import {
  CheckCircle2,
  Link2,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../../context/FamilyContext';
import { useViewportScrollLock } from '../../hooks/useViewportScrollLock';

export default function BringAccountModal() {
  const { t } = useTranslation('shopping');
  const {
    isBringModalOpen,
    setIsBringModalOpen,
    bringCredentials,
    connectBringLogin,
    completeBringConnection,
    disconnectBring,
    fetchBringLiveItems,
    showToast
  } = useFamily();
  const [email, setEmail] = useState(bringCredentials.mail || '');
  const [password, setPassword] = useState('');
  const [lists, setLists] = useState([]);
  const [connectionToken, setConnectionToken] = useState('');
  const [selectedListUuid, setSelectedListUuid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useViewportScrollLock(isBringModalOpen);

  if (!isBringModalOpen) return null;

  const close = () => {
    setIsBringModalOpen(false);
    setPassword('');
    setError('');
  };

  const login = async event => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await connectBringLogin(email, password);
      setLists(data.lists || []);
      setConnectionToken(data.connectionToken);
      setSelectedListUuid(data.lists?.[0]?.listUuid || '');
      setPassword('');
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  };

  const connect = async () => {
    const list = lists.find(entry => entry.listUuid === selectedListUuid);
    setLoading(true);
    setError('');
    try {
      await completeBringConnection({
        connectionToken,
        listUuid: selectedListUuid,
        listName: list?.name || 'Bring! Liste'
      });
      showToast(
        t('accountModal.toastConnectedTitle'),
        t('accountModal.toastConnectedBody', {
          listName: list?.name || t('accountModal.toastDefaultList')
        }),
        'success'
      );
      close();
    } catch (connectError) {
      setError(connectError.message);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    setLoading(true);
    await disconnectBring();
    setLoading(false);
    close();
  };

  return (
    <div className="modal-backdrop" onClick={close}>
      <div
        className="modal-card bring-modal-modern"
        onClick={event => event.stopPropagation()}
      >
        <div className="card-header">
          <div className="bring-modal-heading">
            <span><ShoppingBag size={24} /></span>
            <div>
              <span className="eyebrow">{t('accountModal.eyebrow')}</span>
              <h2>{t('accountModal.title')}</h2>
            </div>
          </div>
          <button className="icon-circle-btn" onClick={close} aria-label={t('common:actions.close')}>
            <X size={20} />
          </button>
        </div>

        {bringCredentials.isConnected ? (
          <div className="bring-connected-panel">
            <div className="bring-connected-icon"><CheckCircle2 size={30} /></div>
            <span className="eyebrow">{t('accountModal.connectedEyebrow')}</span>
            <h3>{bringCredentials.listName || t('accountModal.defaultListName')}</h3>
            <p>{bringCredentials.mail}</p>
            <div className="bring-security-note">
              <ShieldCheck size={18} />
              <span>{t('accountModal.securityNote')}</span>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="auth-primary"
                onClick={fetchBringLiveItems}
                disabled={loading}
              >
                <RefreshCw size={17} /> {t('accountModal.syncNow')}
              </button>
              <button
                type="button"
                className="bring-disconnect"
                onClick={disconnect}
                disabled={loading}
              >
                <Trash2 size={16} /> {t('accountModal.disconnect')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="bring-intro">
              <Link2 size={21} />
              <p>{t('accountModal.intro')}</p>
            </div>

            <form onSubmit={login}>
              <label className="auth-field">
                <span>{t('accountModal.emailLabel')}</span>
                <input
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder={t('accountModal.emailPlaceholder')}
                  required
                />
              </label>
              {!lists.length && (
                <label className="auth-field">
                  <span>{t('accountModal.passwordLabel')}</span>
                  <div className="auth-input-wrap">
                    <LockKeyhole size={18} />
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                      placeholder={t('accountModal.passwordPlaceholder')}
                      required
                    />
                  </div>
                </label>
              )}

              {lists.length > 0 && (
                <label className="auth-field">
                  <span>{t('accountModal.selectListLabel')}</span>
                  <select
                    value={selectedListUuid}
                    onChange={event => setSelectedListUuid(event.target.value)}
                  >
                    {lists.map(list => (
                      <option value={list.listUuid} key={list.listUuid}>
                        {list.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {error && <div className="auth-error">{error}</div>}
              {lists.length ? (
                <button
                  type="button"
                  className="auth-primary"
                  onClick={connect}
                  disabled={!selectedListUuid || loading}
                >
                  {loading ? <LoaderCircle className="spin" size={18} /> : <Link2 size={18} />}
                  {t('accountModal.connectSelected')}
                </button>
              ) : (
                <button
                  type="submit"
                  className="auth-primary"
                  disabled={!email || !password || loading}
                >
                  {loading ? <LoaderCircle className="spin" size={18} /> : <LockKeyhole size={18} />}
                  {t('accountModal.loginButton')}
                </button>
              )}
            </form>
            <p className="bring-fineprint">{t('accountModal.fineprint')}</p>
          </>
        )}
      </div>
    </div>
  );
}
