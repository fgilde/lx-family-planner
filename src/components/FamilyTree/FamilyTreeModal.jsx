import React, { useEffect, useMemo, useState } from 'react';
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
import FamilyConnectionAccess from './FamilyConnectionAccess';

const RELATION_OPTIONS = [
  {
    value: 'parent',
    label: 'Elternfamilie',
    help: 'Die ausgewählte Familie steht über eurer Familie.'
  },
  {
    value: 'child',
    label: 'Kinderfamilie',
    help: 'Die ausgewählte Familie ist ein Familienzweig unter euch.'
  },
  {
    value: 'sibling',
    label: 'Geschwisterfamilie',
    help: 'Beide Familien stehen auf derselben Ebene.'
  },
  {
    value: 'relative',
    label: 'Weitere Verwandte',
    help: 'Zum Beispiel Tante, Onkel, Cousins oder enge Wahlfamilie.'
  }
];

function perspectiveRelation(relationship) {
  if (relationship.direction === 'outgoing') {
    return relationship.relationType;
  }
  if (relationship.relationType === 'parent') return 'child';
  if (relationship.relationType === 'child') return 'parent';
  return relationship.relationType;
}

function relationLabel(type) {
  return RELATION_OPTIONS.find(option => option.value === type)?.label
    || 'Verwandte Familie';
}

function FamilyNode({ family, relation, highlighted = false }) {
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
        <strong>{family?.familyName || 'Unsere Familie'}</strong>
        <span><Users size={13} /> {membersCount} Profile</span>
      </div>
    </article>
  );
}

function FamilyBranch({ family, relation, highlighted = false }) {
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
        aria-label={`Mitglieder von ${family?.familyName || 'dieser Familie'}`}
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
          <span className="tree-member-empty">Keine Profile vorhanden</span>
        )}
      </div>
    </div>
  );
}

export default function FamilyTreeModal({ isOpen, onClose }) {
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
              <ShieldCheck size={14} /> Verbindungen nur mit Bestätigung
            </span>
            <h2><Network size={24} /> Euer Familiennetz</h2>
            <p>
              Verknüpft echte Familienkonten. Eine Verbindung wird erst
              sichtbar, wenn die andere Familie zustimmt.
            </p>
          </div>
          <button
            type="button"
            className="icon-circle-btn"
            onClick={onClose}
            aria-label="Stammbaum schließen"
          >
            <X size={20} />
          </button>
        </header>

        <div className="family-tree-scroll">
          <section className="connected-tree">
            <div className="tree-generation">
              <span className="tree-generation-label">Elternfamilien</span>
              <div className="tree-node-row">
                {parentFamilies.length ? parentFamilies.map(relationship => (
                  <FamilyBranch
                    key={relationship.id}
                    family={relationship.otherFamily}
                    relation={relationLabel(perspectiveRelation(relationship))}
                  />
                )) : (
                  <span className="tree-empty-branch">Noch nicht verknüpft</span>
                )}
              </div>
            </div>

            <span className="tree-connector" />

            <div className="tree-current-row">
              {sideFamilies.map(relationship => (
                <FamilyBranch
                  key={relationship.id}
                  family={relationship.otherFamily}
                  relation={relationLabel(perspectiveRelation(relationship))}
                />
              ))}
              <FamilyBranch
                family={currentFamily}
                relation="Euer Konto"
                highlighted
              />
            </div>

            <span className="tree-connector" />

            <div className="tree-generation">
              <span className="tree-generation-label">Kinderfamilien</span>
              <div className="tree-node-row">
                {childFamilies.length ? childFamilies.map(relationship => (
                  <FamilyBranch
                    key={relationship.id}
                    family={relationship.otherFamily}
                    relation={relationLabel(perspectiveRelation(relationship))}
                  />
                )) : (
                  <span className="tree-empty-branch">Noch kein Familienzweig</span>
                )}
              </div>
            </div>
          </section>

          {pendingIncoming.length > 0 && (
            <section className="relationship-inbox">
              <header>
                <span className="admin-section-kicker">Benötigt eure Entscheidung</span>
                <h3><HeartHandshake size={20} /> Familienanfragen</h3>
              </header>
              {pendingIncoming.map(relationship => (
                <article key={relationship.id}>
                  <FamilyNode
                    family={relationship.otherFamily}
                    relation={relationLabel(
                      perspectiveRelation(relationship)
                    )}
                  />
                  <p>
                    {relationship.otherFamily.familyName} möchte euch als
                    {' '}{relationLabel(
                      relationship.relationType
                    ).toLowerCase()} einordnen.
                  </p>
                  <div>
                    <button
                      type="button"
                      className="accept"
                      disabled={busy}
                      onClick={() => respond(relationship.id, 'accepted')}
                    >
                      <Check size={16} /> Annehmen
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => respond(relationship.id, 'declined')}
                    >
                      <X size={16} /> Ablehnen
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}

          <div className="relationship-management-grid">
            <section className="relationship-request-card">
              <header>
                <span className="admin-section-kicker">Familienkonto verbinden</span>
                <h3><Link2 size={20} /> Neue Verknüpfung</h3>
              </header>
              {canManageFamily(activeMember) ? (
                <form onSubmit={submitRequest}>
                  <label>
                    <span>Registrierte Familie</span>
                    <select
                      value={targetFamilyId}
                      onChange={event => setTargetFamilyId(event.target.value)}
                      required
                    >
                      <option value="">Familie auswählen …</option>
                      {availableFamilies.map(family => (
                        <option value={family.id} key={family.id}>
                          {family.familyName} · {family.membersCount} Profile
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Diese Familie ist eure …</span>
                    <select
                      value={relationType}
                      onChange={event => setRelationType(event.target.value)}
                    >
                      {RELATION_OPTIONS.map(option => (
                        <option value={option.value} key={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p>
                    {RELATION_OPTIONS.find(
                      option => option.value === relationType
                    )?.help}
                  </p>
                  <button
                    className="admin-primary-button"
                    disabled={busy || !targetFamilyId}
                  >
                    <Plus size={16} /> Anfrage senden
                  </button>
                  {!availableFamilies.length && (
                    <small>
                      Alle derzeit registrierten Familien sind bereits
                      verbunden oder angefragt.
                    </small>
                  )}
                </form>
              ) : (
                <p>Nur Erwachsene können Familienkonten verknüpfen.</p>
              )}
            </section>

            <section className="relationship-status-card">
              <header>
                <span className="admin-section-kicker">Verwaltung</span>
                <h3><Clock3 size={20} /> Verbindungen & Anfragen</h3>
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
                          ? 'Wartet auf Bestätigung'
                          : relationLabel(perspectiveRelation(relationship))}
                      </small>
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => remove(relationship.id)}
                      title="Verbindung entfernen"
                    >
                      {confirmRemove === relationship.id
                        ? <span>Bestätigen</span>
                        : <Trash2 size={15} />}
                    </button>
                  </article>
                ))}
                {!pendingOutgoing.length && !accepted.length && (
                  <div className="admin-inline-empty">
                    <Network size={18} /> Noch keine Verbindungen.
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
