import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeEuro,
  CalendarDays,
  CheckSquare,
  Coins,
  Gift,
  HeartHandshake,
  LoaderCircle,
  Send,
  ShieldCheck,
  Star,
  UsersRound
} from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';
import { DEFAULT_REWARD_ICON } from '../Tasks/RewardIcon';
import RewardIconPicker from '../Tasks/RewardIconPicker';

const GRANTS = [
  {
    key: 'sharedCalendar',
    label: 'Gemeinsame Termine',
    help: 'Diese Familie darf euch zu gemeinsam sichtbaren Terminen einladen.',
    icon: CalendarDays
  },
  {
    key: 'tasks',
    label: 'Aufgaben',
    help: 'Erwachsene dieser Familie dürfen euren Kindern Aufgaben geben.',
    icon: CheckSquare
  },
  {
    key: 'rewards',
    label: 'Sterne & Belohnungen',
    help: 'Erlaubt Sternpunkte bei Aufgaben und eigene Belohnungen.',
    icon: Star
  },
  {
    key: 'pocketMoney',
    label: 'Taschengeld',
    help: 'Erlaubt nachvollziehbare Taschengeldbuchungen für eure Kinder.',
    icon: BadgeEuro
  }
];

function ChildChoice({ member, active, onClick }) {
  return (
    <button
      type="button"
      className={active ? 'active' : ''}
      onClick={onClick}
      style={{ '--member-color': member.color || 'var(--primary)' }}
    >
      <span>{member.name.slice(0, 1).toUpperCase()}</span>
      <strong>{member.name}</strong>
      <small>{member.position === 'teenager' ? 'Teenager' : 'Enkelkind'}</small>
    </button>
  );
}

export default function FamilyConnectionAccess({ relationships }) {
  const {
    updateFamilyRelationshipGrants,
    addRelatedFamilyTask,
    addRelatedFamilyReward,
    addRelatedFamilyPocketMoney
  } = useFamily();
  const [savingGrant, setSavingGrant] = useState('');
  const actionable = useMemo(
    () => relationships.filter(relationship => {
      const grants = relationship.grantsFromOther || {};
      return (grants.tasks || grants.rewards || grants.pocketMoney) &&
        relationship.otherFamily?.members?.some(member =>
          ['child', 'teen'].includes(member.role)
        );
    }),
    [relationships]
  );
  const [relationshipId, setRelationshipId] = useState(
    actionable[0]?.id || ''
  );
  const selectedRelationship =
    actionable.find(item => item.id === relationshipId) || actionable[0];
  const children = (selectedRelationship?.otherFamily?.members || [])
    .filter(member => ['child', 'teen'].includes(member.role));
  const [memberId, setMemberId] = useState(children[0]?.id || '');
  const [tool, setTool] = useState('task');
  const [busy, setBusy] = useState(false);
  const [task, setTask] = useState({
    title: '',
    dueDate: new Date().toISOString().slice(0, 10),
    stars: 10
  });
  const [reward, setReward] = useState({
    title: '',
    costStars: 50,
    icon: DEFAULT_REWARD_ICON,
    iconImage: ''
  });
  const [money, setMoney] = useState({
    amount: '5',
    note: 'Von Oma & Opa',
    icon: '💶'
  });

  useEffect(() => {
    if (!actionable.some(item => item.id === relationshipId)) {
      setRelationshipId(actionable[0]?.id || '');
    }
  }, [actionable, relationshipId]);

  useEffect(() => {
    if (!children.some(member => member.id === memberId)) {
      setMemberId(children[0]?.id || '');
    }
  }, [children, memberId]);

  useEffect(() => {
    const grants = selectedRelationship?.grantsFromOther || {};
    if (tool === 'task' && grants.tasks) return;
    if (tool === 'reward' && grants.rewards) return;
    if (tool === 'money' && grants.pocketMoney) return;
    setTool(
      grants.tasks
        ? 'task'
        : grants.rewards
          ? 'reward'
          : grants.pocketMoney
            ? 'money'
            : 'task'
    );
  }, [
    selectedRelationship?.id,
    selectedRelationship?.grantsFromOther?.tasks,
    selectedRelationship?.grantsFromOther?.rewards,
    selectedRelationship?.grantsFromOther?.pocketMoney,
    tool
  ]);

  const toggleGrant = async (relationship, key) => {
    setSavingGrant(`${relationship.id}-${key}`);
    await updateFamilyRelationshipGrants(relationship.id, {
      [key]: !relationship.grantsToOther?.[key]
    });
    setSavingGrant('');
  };

  const submitPlanner = async event => {
    event.preventDefault();
    if (!selectedRelationship || !memberId) return;
    setBusy(true);
    let result = null;
    if (tool === 'task') {
      result = await addRelatedFamilyTask(selectedRelationship.id, {
        memberId,
        title: task.title,
        dueDate: task.dueDate,
        stars: Number(task.stars || 0),
        category: 'Familie'
      });
      if (result) setTask(previous => ({ ...previous, title: '' }));
    }
    if (tool === 'reward') {
      result = await addRelatedFamilyReward(selectedRelationship.id, {
        memberId,
        title: reward.title,
        costStars: Number(reward.costStars || 1),
        icon: reward.icon,
        iconImage: reward.iconImage
      });
      if (result) setReward(previous => ({ ...previous, title: '' }));
    }
    if (tool === 'money') {
      result = await addRelatedFamilyPocketMoney(selectedRelationship.id, {
        memberId,
        amountCents: Math.round(Number(money.amount || 0) * 100),
        note: money.note,
        icon: money.icon
      });
    }
    setBusy(false);
  };

  return (
    <section className="family-access-section">
      <header>
        <span className="admin-section-kicker">Sicher zusammen organisieren</span>
        <h3><ShieldCheck size={20} /> Freigaben im Familiennetz</h3>
        <p>
          Ihr entscheidet je Verbindung. Die andere Familie sieht keine
          privaten Kalender, Chats oder Pinnwand-Inhalte.
        </p>
      </header>

      <div className="family-access-grid">
        {relationships.map(relationship => (
          <article className="family-access-card" key={relationship.id}>
            <header>
              <span>
                {relationship.otherFamily.familyName.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <strong>{relationship.otherFamily.familyName}</strong>
                <small>
                  Was diese Familie für eure Kinder tun darf
                </small>
              </div>
            </header>
            <div className="family-grant-list">
              {GRANTS.map(grant => {
                const Icon = grant.icon;
                const active = Boolean(
                  relationship.grantsToOther?.[grant.key]
                );
                return (
                  <button
                    type="button"
                    key={grant.key}
                    className={active ? 'active' : ''}
                    onClick={() => toggleGrant(relationship, grant.key)}
                    disabled={
                      savingGrant === `${relationship.id}-${grant.key}`
                    }
                    title={grant.help}
                  >
                    <Icon size={16} />
                    <span>
                      <strong>{grant.label}</strong>
                      <small>{grant.help}</small>
                    </span>
                    <i>{active ? 'An' : 'Aus'}</i>
                  </button>
                );
              })}
            </div>
            <footer>
              <HeartHandshake size={14} />
              Von dort für euch freigegeben:{' '}
              {GRANTS
                .filter(grant => relationship.grantsFromOther?.[grant.key])
                .map(grant => grant.label)
                .join(', ') || 'noch nichts'}
            </footer>
          </article>
        ))}
      </div>

      {actionable.length > 0 && (
        <div className="grandchild-planner">
          <header>
            <span className="grandchild-planner-icon">
              <UsersRound size={22} />
            </span>
            <div>
              <span className="admin-section-kicker">Für Enkelkinder</span>
              <h3>Von Familie zu Familie</h3>
              <p>
                Aufgabe, Belohnung oder Taschengeld landet direkt und
                nachvollziehbar im Familienkonto des Kindes.
              </p>
            </div>
          </header>

          {actionable.length > 1 && (
            <label className="grandchild-family-select">
              <span>Familienzweig</span>
              <select
                value={selectedRelationship?.id || ''}
                onChange={event => setRelationshipId(event.target.value)}
              >
                {actionable.map(relationship => (
                  <option key={relationship.id} value={relationship.id}>
                    {relationship.otherFamily.familyName}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="grandchild-choices">
            {children.map(member => (
              <ChildChoice
                key={member.id}
                member={member}
                active={member.id === memberId}
                onClick={() => setMemberId(member.id)}
              />
            ))}
          </div>

          <div className="grandchild-tools">
            {selectedRelationship.grantsFromOther?.tasks && (
              <button
                type="button"
                className={tool === 'task' ? 'active' : ''}
                onClick={() => setTool('task')}
              >
                <CheckSquare size={16} /> Aufgabe
              </button>
            )}
            {selectedRelationship.grantsFromOther?.rewards && (
              <button
                type="button"
                className={tool === 'reward' ? 'active' : ''}
                onClick={() => setTool('reward')}
              >
                <Gift size={16} /> Belohnung
              </button>
            )}
            {selectedRelationship.grantsFromOther?.pocketMoney && (
              <button
                type="button"
                className={tool === 'money' ? 'active' : ''}
                onClick={() => setTool('money')}
              >
                <Coins size={16} /> Taschengeld
              </button>
            )}
          </div>

          <form onSubmit={submitPlanner}>
            {tool === 'task' &&
              selectedRelationship.grantsFromOther?.tasks && (
                <>
                  <label>
                    <span>Aufgabe</span>
                    <input
                      value={task.title}
                      onChange={event => setTask(previous => ({
                        ...previous,
                        title: event.target.value
                      }))}
                      placeholder="z. B. Oma im Garten helfen"
                      required
                    />
                  </label>
                  <label>
                    <span>Bis wann?</span>
                    <input
                      type="date"
                      value={task.dueDate}
                      onChange={event => setTask(previous => ({
                        ...previous,
                        dueDate: event.target.value
                      }))}
                      required
                    />
                  </label>
                  {selectedRelationship.grantsFromOther?.rewards && (
                    <label>
                      <span>Sterne</span>
                      <input
                        type="number"
                        min="0"
                        max="1000"
                        step="5"
                        value={task.stars}
                        onChange={event => setTask(previous => ({
                          ...previous,
                          stars: event.target.value
                        }))}
                      />
                    </label>
                  )}
                </>
              )}
            {tool === 'reward' &&
              selectedRelationship.grantsFromOther?.rewards && (
                <>
                  <label>
                    <span>Belohnung</span>
                    <input
                      value={reward.title}
                      onChange={event => setReward(previous => ({
                        ...previous,
                        title: event.target.value
                      }))}
                      placeholder="z. B. Ein Nachmittag im Zoo"
                      required
                    />
                  </label>
                  <label>
                    <span>Sternepreis</span>
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={reward.costStars}
                      onChange={event => setReward(previous => ({
                        ...previous,
                        costStars: event.target.value
                      }))}
                      required
                    />
                  </label>
                  <div className="grandchild-reward-icon-field">
                    <span>Bild der Belohnung</span>
                    <RewardIconPicker
                      value={reward.icon}
                      image={reward.iconImage}
                      onChange={({ icon, iconImage }) => setReward(previous => ({
                        ...previous,
                        icon,
                        iconImage
                      }))}
                    />
                  </div>
                </>
              )}
            {tool === 'money' &&
              selectedRelationship.grantsFromOther?.pocketMoney && (
                <>
                  <label>
                    <span>Betrag in Euro</span>
                    <input
                      type="number"
                      min="-10000"
                      max="10000"
                      step="0.50"
                      value={money.amount}
                      onChange={event => setMoney(previous => ({
                        ...previous,
                        amount: event.target.value
                      }))}
                      required
                    />
                  </label>
                  <label>
                    <span>Wofür?</span>
                    <input
                      value={money.note}
                      onChange={event => setMoney(previous => ({
                        ...previous,
                        note: event.target.value
                      }))}
                      maxLength={160}
                      required
                    />
                  </label>
                </>
              )}
            <button
              className="admin-primary-button"
              disabled={busy || !memberId}
            >
              {busy
                ? <LoaderCircle className="spin" size={16} />
                : <Send size={16} />}
              An das Kinderprofil senden
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
