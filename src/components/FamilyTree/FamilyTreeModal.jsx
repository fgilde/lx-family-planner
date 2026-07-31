import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  Clock3,
  HeartHandshake,
  Link2,
  Network,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
  X
} from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';
import { canManageFamily, getPositionLabel } from '../../constants/roles';
import {
  DEFAULT_FAMILY_AVATAR,
  DEFAULT_MEMBER_AVATAR,
  handleImgError
} from '../../utils/imageFallback';
import { toLocaleLowerCase } from '../../utils/formatting';
import FamilyConnectionAccess from './FamilyConnectionAccess';

const RELATION_OPTIONS = [
  { value: 'parent' },
  { value: 'child' },
  { value: 'sibling' },
  { value: 'relative' }
];

function perspectiveRelation(relationship) {
  if (relationship.direction === 'outgoing') {
    return relationship.relationType;
  }
  if (relationship.relationType === 'parent') return 'child';
  if (relationship.relationType === 'child') return 'parent';
  return relationship.relationType;
}

function relationLabel(t, type) {
  return RELATION_OPTIONS.some(option => option.value === type)
    ? t(`tree.relations.${type}.label`)
    : t('tree.relations.fallback');
}

function FamilyNode({ family, relation, highlighted = false }) {
  const { t } = useTranslation('familyTree');
  const membersCount = Array.isArray(family?.members)
    ? family.members.length
    : family?.membersCount || 0;
  return (
    <article className={`tree-family-node ${highlighted ? 'current' : ''}`}>
      <img
        src={family?.familyAvatar || DEFAULT_FAMILY_AVATAR}
        onError={handleImgError}
        alt=""
      />
      <div>
        <small>{relation}</small>
        <strong>{family?.familyName || t('tree.node.ourFamily')}</strong>
        <span><Users size={13} /> {t('tree.node.profiles', { count: membersCount })}</span>
      </div>
    </article>
  );
}

function FamilyBranch({ family, relation, highlighted = false }) {
  const { t } = useTranslation('familyTree');
  const familyMembers = Array.isArray(family?.members) ? family.members : [];
  return (
    <div className={`tree-family-branch ${highlighted ? 'current' : ''}`}>
      <FamilyNode
        family={family}
        relation={relation}
        highlighted={highlighted}
      />
      <div
        className="tree-member-roster"
        aria-label={t('tree.branch.membersAria', {
          familyName: family?.familyName || t('tree.branch.thisFamily')
        })}
      >
        {familyMembers.map(member => (
          <article
            key={member.id}
            style={{ '--member-accent': member.color || 'var(--primary)' }}
          >
            <img
              src={member.avatar || DEFAULT_MEMBER_AVATAR}
              onError={event => handleImgError(event, DEFAULT_MEMBER_AVATAR)}
              alt=""
            />
            <span>
              <strong>{member.name}</strong>
              <small>{getPositionLabel(member)}</small>
            </span>
          </article>
        ))}
        {!familyMembers.length && (
          <span className="tree-member-empty">{t('tree.branch.noProfiles')}</span>
        )}
      </div>
    </div>
  );
}

export default function FamilyTreeModal({ isOpen, onClose }) {
  const { t } = useTranslation('familyTree');
  const {
    members,
    familyAccount,
    activeMember,
    familiesList,
    refreshPublicFamilies,
    familyRelationships,
    requestFamilyRelationship,
    respondFamilyRelationship,
    removeFamilyRelationship
  } = useFamily();
  const [targetFamilyId, setTargetFamilyId] = useState('');
  const [relationType, setRelationType] = useState('parent');
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState('');

  useEffect(() => {
    if (isOpen) refreshPublicFamilies();
  }, [isOpen, refreshPublicFamilies]);

  const accepted = useMemo(
    () => familyRelationships.filter(item => item.status === 'accepted'),
    [familyRelationships]
  );
  const pendingIncoming = familyRelationships.filter(
    item => item.status === 'pending' && item.direction === 'incoming'
  );
  const pendingOutgoing = familyRelationships.filter(
    item => item.status === 'pending' && item.direction === 'outgoing'
  );
  const relatedIds = new Set(
    familyRelationships.map(item => item.otherFamily?.id).filter(Boolean)
  );
  const availableFamilies = familiesList.filter(
    family => family.id !== familyAccount?.id && !relatedIds.has(family.id)
  );
  const parentFamilies = accepted.filter(
    relationship => perspectiveRelation(relationship) === 'parent'
  );
  const childFamilies = accepted.filter(
    relationship => perspectiveRelation(relationship) === 'child'
  );
  const sideFamilies = accepted.filter(relationship =>
    ['sibling', 'relative'].includes(perspectiveRelation(relationship))
  );

  if (!isOpen) return null;

  const submitRequest = async event => {
    event.preventDefault();
    if (!targetFamilyId) return;
    setBusy(true);
    const created = await requestFamilyRelationship(
      targetFamilyId,
      relationType
    );
    setBusy(false);
    if (created) setTargetFamilyId('');
  };

  const respond = async (id, status) => {
    setBusy(true);
    await respondFamilyRelationship(id, status);
    setBusy(false);
  };

  const remove = async id => {
    if (confirmRemove !== id) {
      setConfirmRemove(id);
      return;
    }
    setBusy(true);
    await removeFamilyRelationship(id);
    setBusy(false);
    setConfirmRemove('');
  };

  const currentFamily = {
    ...familyAccount,
    membersCount: members.length,
    members
  };

  return (
    <div className="modal-backdrop family-tree-backdrop" onClick={onClose}>
      <div
        className="modal-card family-tree-modal"
        onClick={event => event.stopPropagation()}
      >
        <header className="family-tree-header">
          <div>
            <span className="admin-section-kicker">
              <ShieldCheck size={14} /> {t('tree.header.kicker')}
            </span>
            <h2><Network size={24} /> {t('tree.header.title')}</h2>
            <p>
              {t('tree.header.description')}
            </p>
          </div>
          <button
            type="button"
            className="icon-circle-btn"
            onClick={onClose}
            aria-label={t('tree.header.closeAria')}
          >
            <X size={20} />
          </button>
        </header>

        <div className="family-tree-scroll">
          <section className="connected-tree">
            <div className="tree-generation">
              <span className="tree-generation-label">{t('tree.generations.parents')}</span>
              <div className="tree-node-row">
                {parentFamilies.length ? parentFamilies.map(relationship => (
                  <FamilyBranch
                    key={relationship.id}
                    family={relationship.otherFamily}
                    relation={relationLabel(t, perspectiveRelation(relationship))}
                  />
                )) : (
                  <span className="tree-empty-branch">{t('tree.generations.parentsEmpty')}</span>
                )}
              </div>
            </div>

            <span className="tree-connector" />

            <div className="tree-current-row">
              {sideFamilies.map(relationship => (
                <FamilyBranch
                  key={relationship.id}
                  family={relationship.otherFamily}
                  relation={relationLabel(t, perspectiveRelation(relationship))}
                />
              ))}
              <FamilyBranch
                family={currentFamily}
                relation={t('tree.generations.ourAccount')}
                highlighted
              />
            </div>

            <span className="tree-connector" />

            <div className="tree-generation">
              <span className="tree-generation-label">{t('tree.generations.children')}</span>
              <div className="tree-node-row">
                {childFamilies.length ? childFamilies.map(relationship => (
                  <FamilyBranch
                    key={relationship.id}
                    family={relationship.otherFamily}
                    relation={relationLabel(t, perspectiveRelation(relationship))}
                  />
                )) : (
                  <span className="tree-empty-branch">{t('tree.generations.childrenEmpty')}</span>
                )}
              </div>
            </div>
          </section>

          {pendingIncoming.length > 0 && (
            <section className="relationship-inbox">
              <header>
                <span className="admin-section-kicker">{t('tree.inbox.kicker')}</span>
                <h3><HeartHandshake size={20} /> {t('tree.inbox.title')}</h3>
              </header>
              {pendingIncoming.map(relationship => (
                <article key={relationship.id}>
                  <FamilyNode
                    family={relationship.otherFamily}
                    relation={relationLabel(
                      t,
                      perspectiveRelation(relationship)
                    )}
                  />
                  <p>
                    {t('tree.inbox.request', {
                      familyName: relationship.otherFamily.familyName,
                      relation: toLocaleLowerCase(
                        relationLabel(t, relationship.relationType)
                      )
                    })}
                  </p>
                  <div>
                    <button
                      type="button"
                      className="accept"
                      disabled={busy}
                      onClick={() => respond(relationship.id, 'accepted')}
                    >
                      <Check size={16} /> {t('tree.inbox.accept')}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => respond(relationship.id, 'declined')}
                    >
                      <X size={16} /> {t('tree.inbox.decline')}
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}

          <div className="relationship-management-grid">
            <section className="relationship-request-card">
              <header>
                <span className="admin-section-kicker">{t('tree.request.kicker')}</span>
                <h3><Link2 size={20} /> {t('tree.request.title')}</h3>
              </header>
              {canManageFamily(activeMember) ? (
                <form onSubmit={submitRequest}>
                  <label>
                    <span>{t('tree.request.registeredFamily')}</span>
                    <select
                      value={targetFamilyId}
                      onChange={event => setTargetFamilyId(event.target.value)}
                      required
                    >
                      <option value="">{t('tree.request.selectFamily')}</option>
                      {availableFamilies.map(family => (
                        <option value={family.id} key={family.id}>
                          {family.familyName} · {t('tree.node.profiles', { count: family.membersCount })}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>{t('tree.request.relationLabel')}</span>
                    <select
                      value={relationType}
                      onChange={event => setRelationType(event.target.value)}
                    >
                      {RELATION_OPTIONS.map(option => (
                        <option value={option.value} key={option.value}>
                          {t(`tree.relations.${option.value}.label`)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p>
                    {t(`tree.relations.${relationType}.help`)}
                  </p>
                  <button
                    className="admin-primary-button"
                    disabled={busy || !targetFamilyId}
                  >
                    <Plus size={16} /> {t('tree.request.send')}
                  </button>
                  {!availableFamilies.length && (
                    <small>
                      {t('tree.request.allConnected')}
                    </small>
                  )}
                </form>
              ) : (
                <p>{t('tree.request.adultsOnly')}</p>
              )}
            </section>

            <section className="relationship-status-card">
              <header>
                <span className="admin-section-kicker">{t('tree.manage.kicker')}</span>
                <h3><Clock3 size={20} /> {t('tree.manage.title')}</h3>
              </header>
              <div className="relationship-status-list">
                {[...pendingOutgoing, ...accepted].map(relationship => (
                  <article key={relationship.id}>
                    <img
                      src={
                        relationship.otherFamily.familyAvatar
                        || DEFAULT_FAMILY_AVATAR
                      }
                      onError={handleImgError}
                      alt=""
                    />
                    <span>
                      <strong>{relationship.otherFamily.familyName}</strong>
                      <small>
                        {relationship.status === 'pending'
                          ? t('tree.manage.pending')
                          : relationLabel(t, perspectiveRelation(relationship))}
                      </small>
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => remove(relationship.id)}
                      title={t('tree.manage.removeTitle')}
                    >
                      {confirmRemove === relationship.id
                        ? <span>{t('common:actions.confirm')}</span>
                        : <Trash2 size={15} />}
                    </button>
                  </article>
                ))}
                {!pendingOutgoing.length && !accepted.length && (
                  <div className="admin-inline-empty">
                    <Network size={18} /> {t('tree.manage.empty')}
                  </div>
                )}
              </div>
            </section>
          </div>

          {canManageFamily(activeMember) && accepted.length > 0 && (
            <FamilyConnectionAccess relationships={accepted} />
          )}
        </div>
      </div>
    </div>
  );
}
