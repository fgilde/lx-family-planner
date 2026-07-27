import React, { useState } from 'react';
import { useFamily } from '../../context/FamilyContext';
import {
  CheckSquare,
  Plus,
  Star,
  Gift,
  Check,
  Sparkles,
  User,
  Edit3,
  Trash2,
  X,
  Clock3,
  ShieldCheck,
  RotateCcw,
  CalendarDays,
  Repeat2
} from 'lucide-react';
import { canManageFamily, getPositionLabel, isChildProfile } from '../../constants/roles';

const REWARD_ICONS = ['🍦', '🎮', '🍿', '🎪', '🍕', '🚀', '🎁', '🛹', '🎳', '🍔', '🎨', '🏖️'];
const REPEAT_LABELS = {
  none: 'Einmalig',
  daily: 'Jeden Tag',
  weekdays: 'Montag bis Freitag',
  weekly: 'Jede Woche',
  monthly: 'Jeden Monat'
};

function formatTaskDate(value) {
  if (!value) return '';
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('de-DE', {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
      });
}

function currentLocalDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

export default function ChoreRewardsPlanner() {
  const {
    tasks, toggleTask, reviewTask, addTask, rewards, addReward, updateReward, deleteReward, redeemReward,
    members, activeMember, activeHousehold, showToast
  } = useFamily();

  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskMemberId, setTaskMemberId] = useState(members[0]?.id || '');
  const [taskStars, setTaskStars] = useState(15);
  const [taskCategory, setTaskCategory] = useState('Haushalt');
  const [taskDueDate, setTaskDueDate] = useState(
    currentLocalDate
  );
  const [taskRepeatRule, setTaskRepeatRule] = useState('none');

  // Reward Creator / Editor State
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardCost, setRewardCost] = useState(50);
  const [rewardIcon, setRewardIcon] = useState('🍦');
  const [rewardForMemberId, setRewardForMemberId] = useState('all');

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    addTask({
      title: taskTitle,
      memberId: taskMemberId,
      stars: Number(taskStars),
      category: taskCategory,
      dueDate: taskDueDate,
      repeatRule: taskRepeatRule
    });

    setTaskTitle('');
    setIsAddTaskOpen(false);
  };

  const handleOpenCreateReward = () => {
    setEditingReward(null);
    setRewardTitle('');
    setRewardCost(50);
    setRewardIcon('🍦');
    setRewardForMemberId('all');
    setIsRewardModalOpen(true);
  };

  const handleOpenEditReward = (reward) => {
    setEditingReward(reward);
    setRewardTitle(reward.title);
    setRewardCost(reward.costStars);
    setRewardIcon(reward.icon || '🎁');
    setRewardForMemberId(reward.forMemberId || 'all');
    setIsRewardModalOpen(true);
  };

  const handleSaveReward = (e) => {
    e.preventDefault();
    if (!rewardTitle.trim()) return;

    if (editingReward) {
      updateReward(editingReward.id, {
        title: rewardTitle,
        costStars: Number(rewardCost),
        icon: rewardIcon,
        forMemberId: rewardForMemberId
      });
    } else {
      addReward({
        title: rewardTitle,
        costStars: Number(rewardCost),
        icon: rewardIcon,
        forMemberId: rewardForMemberId
      });
    }

    setIsRewardModalOpen(false);
  };

  const isParent = canManageFamily(activeMember);
  const visibleMembers = isParent ? members : [activeMember].filter(Boolean);
  const approvalsForMe = tasks.filter(
    task =>
      task.completionStatus === 'pending_approval' &&
      (
        !task.createdByMemberId ||
        !members.some(member => member.id === task.createdByMemberId) ||
        task.createdByMemberId === activeMember?.id
      )
  ).length;

  // Filter rewards: Parents see all rewards; Kids see rewards specifically for them or for 'all'
  const visibleRewards = rewards.filter(r => {
    if (isParent) return true;
    const target = r.forMemberId || 'all';
    return target === 'all' || target === activeMember.id;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* HEADER CARD */}
      <div className="card" style={{ padding: 20 }}>
        <div className="card-header" style={{ marginBottom: 12 }}>
          <h2 className="card-title" style={{ color: 'var(--primary)' }}>
            <CheckSquare size={24} /> Aufgaben & Sterne-Belohnungsshop
          </h2>
          <div style={{ display: 'flex', gap: 10 }}>
            {isParent && (
              <button className="btn-secondary" onClick={handleOpenCreateReward}>
                <Gift size={18} /> Eigene Belohnung anlegen
              </button>
            )}
            {isParent && <button className="btn-primary" onClick={() => setIsAddTaskOpen(true)}>
              <Plus size={18} /> Neue Aufgabe zuteilen
            </button>}
          </div>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Kinder melden eine Aufgabe als erledigt. Sterne gibt es erst, wenn der
          Elternteil, der sie erstellt hat, die Erledigung bestätigt.
        </p>
        {isParent && approvalsForMe > 0 && (
          <div className="task-approval-callout">
            <ShieldCheck size={18} />
            <strong>
              {approvalsForMe} {approvalsForMe === 1 ? 'Aufgabe wartet' : 'Aufgaben warten'} auf deine Prüfung
            </strong>
          </div>
        )}
      </div>

      {/* SECTION 1: TASKS BY FAMILY MEMBER */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {visibleMembers.map(member => {
          const memberTasks = tasks.filter(
            task =>
              task.memberId === member.id &&
              (task.household || 'familie') === activeHousehold
          ).sort((left, right) => {
            if (Boolean(left.completed) !== Boolean(right.completed)) {
              return left.completed ? 1 : -1;
            }
            return String(left.dueDate || '9999-12-31').localeCompare(
              String(right.dueDate || '9999-12-31')
            );
          });

          return (
            <div key={member.id} className="card" style={{ borderTop: `6px solid ${member.color || 'var(--primary)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img src={member.avatar} alt={member.name} className="avatar-img-sm" style={{ width: 44, height: 44 }} />
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>{member.name}</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{getPositionLabel(member)}</span>
                  </div>
                </div>

                <div style={{ background: 'color-mix(in srgb, var(--warning) 11%, var(--bg-elevated))', border: '1px solid color-mix(in srgb, var(--warning) 35%, var(--border-color))', color: 'var(--warning)', padding: '6px 14px', borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Star size={18} fill="#f59e0b" /> {member.stars || 0}★
                </div>
              </div>

              {/* Task Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {memberTasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Keine Aufgaben für {member.name.split(' ')[0]} zugeteilt.
                  </div>
                ) : (
                  memberTasks.map(task => {
                    const isPending = task.completionStatus === 'pending_approval';
                    const creatorStillExists =
                      !task.createdByMemberId ||
                      members.some(member => member.id === task.createdByMemberId);
                    const canReview =
                      isParent &&
                      isPending &&
                      (!task.createdByMemberId ||
                        !creatorStillExists ||
                        task.createdByMemberId === activeMember?.id);
                    const canUseMainAction = isParent
                      ? !isPending
                      : !task.completed;
                    return (
                      <article
                        key={task.id}
                        className={`task-approval-item ${
                          task.completed ? 'completed' : ''
                        } ${isPending ? 'pending' : ''}`}
                      >
                        <button
                          type="button"
                          className="task-approval-main"
                          onClick={() => toggleTask(task.id)}
                          disabled={!canUseMainAction}
                          title={
                            isPending && !canReview
                              ? `Die Prüfung wartet auf ${task.createdByName || 'den Ersteller'}.`
                              : undefined
                          }
                        >
                          <span className="task-status-mark">
                            {task.completed ? (
                              <Check size={17} />
                            ) : isPending ? (
                              <Clock3 size={17} />
                            ) : (
                              <span />
                            )}
                          </span>
                          <span className="task-approval-copy">
                            <strong>{task.title}</strong>
                            <small>
                              {task.completed
                                ? 'Bestätigt und gutgeschrieben'
                                : isPending
                                  ? `Zur Prüfung bei ${task.createdByName || 'einem Elternteil'}`
                                  : isParent
                                    ? `Erstellt von ${task.createdByName || 'einem Elternteil'}`
                                    : 'Tippen, wenn du fertig bist'}
                            </small>
                            {(task.dueDate ||
                              (task.repeatRule &&
                                task.repeatRule !== 'none')) && (
                              <span className="task-schedule-row">
                                {task.dueDate && (
                                  <span>
                                    <CalendarDays size={12} />
                                    {formatTaskDate(task.dueDate)}
                                  </span>
                                )}
                                {task.repeatRule &&
                                  task.repeatRule !== 'none' && (
                                    <span>
                                      <Repeat2 size={12} />
                                      {REPEAT_LABELS[task.repeatRule] ||
                                        'Wiederkehrend'}
                                    </span>
                                  )}
                              </span>
                            )}
                          </span>
                          <span className="task-star-value">
                            <Star size={14} fill="#f59e0b" /> +{task.stars}
                          </span>
                        </button>

                        {canReview && (
                          <div className="task-review-actions">
                            <button
                              type="button"
                              className="task-review-approve"
                              onClick={() => reviewTask(task.id, true)}
                            >
                              <Check size={16} /> Wirklich erledigt
                            </button>
                            <button
                              type="button"
                              className="task-review-reject"
                              onClick={() => reviewTask(task.id, false)}
                            >
                              <RotateCcw size={15} /> Noch einmal
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* SECTION 2: PER-CHILD REWARDS SHOP */}
      <div className="card">
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 16, color: '#d97706', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Gift size={24} /> Sterne-Belohnungsshop {isChildProfile(activeMember) ? `für ${activeMember.name}` : ''}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {visibleRewards.map(reward => {
            const targetChild = members.find(m => m.id === reward.forMemberId);

            return (
              <div
                key={reward.id}
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  position: 'relative'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: '2rem' }}>{reward.icon || '🎁'}</span>
                    
                    {/* Edit & Delete Action Buttons for Parents */}
                    {isParent && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="icon-circle-btn"
                          style={{ width: 30, height: 30, background: 'var(--bg-elevated)' }}
                          onClick={() => handleOpenEditReward(reward)}
                          title="Belohnung bearbeiten"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          className="icon-circle-btn"
                          style={{ width: 30, height: 30, background: 'var(--bg-elevated)', color: 'var(--danger)' }}
                          onClick={() => deleteReward(reward.id)}
                          title="Belohnung löschen"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 4 }}>{reward.title}</h4>

                  {/* Child Specific Badge */}
                  <div style={{ marginBottom: 8 }}>
                    <span className="badge" style={{ background: targetChild ? targetChild.color : 'var(--primary)', color: 'white', fontSize: '0.75rem' }}>
                      {targetChild ? `🧒 Für ${targetChild.name}` : '✨ Für alle Kinder'}
                    </span>
                  </div>

                  <div style={{ fontWeight: 800, color: '#d97706', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14 }}>
                    <Star size={16} fill="#f59e0b" /> Benötigt {reward.costStars} Sterne
                  </div>
                </div>

                {/* Redeem Button */}
                <button
                  className="btn-primary"
                  style={{ width: '100%', background: '#d97706', justifyContent: 'center' }}
                  onClick={() => redeemReward(reward, activeMember.id)}
                >
                  Für {activeMember.name.split(' ')[0]} einlösen!
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* CREATE / EDIT REWARD MODAL */}
      {isRewardModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsRewardModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="card-header" style={{ marginBottom: 16 }}>
              <h2 className="card-title">
                {editingReward ? 'Belohnung bearbeiten' : 'Neue Belohnung anlegen'}
              </h2>
              <button className="icon-circle-btn" onClick={() => setIsRewardModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveReward}>
              <div className="form-group">
                <label className="form-label">Titel der Belohnung</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="z. B. 1x Zoo Ausflug, 30 Min Zocken..."
                  value={rewardTitle}
                  onChange={e => setRewardTitle(e.target.value)}
                  required
                />
              </div>

              {/* Select Target Child / Member */}
              <div className="form-group">
                <label className="form-label">Für welches Kind ist diese Belohnung?</label>
                <select
                  className="form-select"
                  value={rewardForMemberId}
                  onChange={e => setRewardForMemberId(e.target.value)}
                >
                  <option value="all">✨ Für alle Kinder</option>
                  {members.filter(isChildProfile).map(child => (
                    <option key={child.id} value={child.id}>🧒 {child.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Sterne-Kosten</label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  className="form-input"
                  value={rewardCost}
                  onChange={e => setRewardCost(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Wunsch-Icon wählen</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {REWARD_ICONS.map(ic => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setRewardIcon(ic)}
                      style={{
                        fontSize: '1.5rem', width: 44, height: 44, borderRadius: 'var(--radius-md)',
                        border: `2px solid ${rewardIcon === ic ? 'var(--primary)' : 'var(--border-color)'}`,
                        background: rewardIcon === ic ? 'var(--bg-subtle)' : 'var(--bg-card)',
                        cursor: 'pointer'
                      }}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Speichern
                </button>
                <button type="button" className="btn-secondary" onClick={() => setIsRewardModalOpen(false)}>
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {isAddTaskOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddTaskOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="card-header" style={{ marginBottom: 16 }}>
              <h2 className="card-title">Neue Aufgabe zuteilen</h2>
              <button className="icon-circle-btn" onClick={() => setIsAddTaskOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label className="form-label">Aufgabe / Pflicht</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="z. B. Zimmer aufräumen, Spülmaschine ausräumen..."
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Zuteilen an</label>
                <select className="form-select" value={taskMemberId} onChange={e => setTaskMemberId(e.target.value)}>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>

              <div className="task-schedule-editor">
                <div className="task-schedule-editor-title">
                  <CalendarDays size={18} />
                  <div>
                    <strong>Wann ist die Aufgabe dran?</strong>
                    <span>
                      Wiederholungen werden nach der Bestätigung automatisch
                      neu eingeplant.
                    </span>
                  </div>
                </div>
                <div className="task-schedule-fields">
                  <label className="form-group">
                    <span className="form-label">Fällig am</span>
                    <input
                      type="date"
                      className="form-input"
                      value={taskDueDate}
                      onChange={event => setTaskDueDate(event.target.value)}
                      required={taskRepeatRule !== 'none'}
                    />
                  </label>
                  <label className="form-group">
                    <span className="form-label">Wiederholung</span>
                    <select
                      className="form-select"
                      value={taskRepeatRule}
                      onChange={event =>
                        setTaskRepeatRule(event.target.value)
                      }
                    >
                      {Object.entries(REPEAT_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Bereich</label>
                <select
                  className="form-select"
                  value={taskCategory}
                  onChange={event => setTaskCategory(event.target.value)}
                >
                  <option value="Haushalt">Haushalt</option>
                  <option value="Küche">Küche</option>
                  <option value="Zimmer">Zimmer</option>
                  <option value="Schule">Schule</option>
                  <option value="Haustier">Haustier</option>
                  <option value="Garten">Garten</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Sterne-Belohnung (+ Sterne)</label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  className="form-input"
                  value={taskStars}
                  onChange={e => setTaskStars(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Aufgabe Erstellen
                </button>
                <button type="button" className="btn-secondary" onClick={() => setIsAddTaskOpen(false)}>
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
