import React, { useEffect, useMemo, useState } from 'react';
import {
  AlarmClock,
  BadgeEuro,
  BellOff,
  BookOpenCheck,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Clock3,
  Coins,
  GraduationCap,
  HeartHandshake,
  Medal,
  MessageCircleHeart,
  PiggyBank,
  Plus,
  RotateCw,
  ShieldAlert,
  Sparkles,
  Star,
  Target,
  Trash2,
  Trophy,
  UsersRound,
  Vote
} from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';
import {
  canManageFamily,
  isChildProfile,
  isManagedProfile
} from '../../constants/roles';

const SECTIONS = [
  { id: 'today', label: 'Wochenblick', icon: Sparkles },
  { id: 'routines', label: 'Routinen', icon: AlarmClock },
  { id: 'money', label: 'Taschengeld', icon: PiggyBank },
  { id: 'school', label: 'Schule', icon: GraduationCap },
  { id: 'polls', label: 'Abstimmen', icon: Vote },
  { id: 'safety', label: 'Sicher & ruhig', icon: ShieldAlert }
];

const ROUTINE_ICONS = ['☀️', '🎒', '🪥', '🛁', '🌙', '⚡'];
const MISSION_ICONS = ['🤝', '🏡', '🌳', '🎲', '🍕', '🚲'];
const ENCOURAGEMENT_ICONS = ['💛', '🌟', '🦁', '🚀', '🦄', '💪'];
const GOAL_ICONS = ['🎯', '🚲', '🎮', '📚', '🎸', '🛼'];
const SCHOOL_KIND = {
  lesson: { label: 'Stundenplan', icon: '📘' },
  homework: { label: 'Hausaufgabe', icon: '✏️' },
  exam: { label: 'Klassenarbeit', icon: '🧠' },
  bag: { label: 'Ranzen-Check', icon: '🎒' }
};
const WEEKDAYS = [
  'Sonntag',
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag'
];

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function euro(cents = 0) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(Number(cents || 0) / 100);
}

function lastSevenDateKeys() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return localDateKey(date);
  });
}

function routineStreak(routine) {
  let streak = 0;
  const cursor = new Date();
  for (let index = 0; index < 45; index += 1) {
    const key = localDateKey(cursor);
    const completed = new Set(routine.completions?.[key] || []);
    if (completed.size !== routine.steps?.length) {
      if (index === 0) {
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function PanelHeader({ kicker, title, icon: Icon, children }) {
  return (
    <header className="family-life-panel-header">
      <div>
        <span>{kicker}</span>
        <h2><Icon size={21} /> {title}</h2>
      </div>
      {children}
    </header>
  );
}

function Creator({ title, children, open = false }) {
  return (
    <details className="family-life-creator" open={open}>
      <summary><Plus size={16} /> {title}</summary>
      {children}
    </details>
  );
}

export default function FamilyLifeHub() {
  const {
    activeMember,
    members,
    tasks,
    events,
    dailyRoutines,
    savingsGoals,
    pocketMoneyTransactions,
    schoolItems,
    familyPolls,
    encouragements,
    familyMissions,
    familySettings,
    addFamilyLifeRecord,
    updateFamilyLifeRecord,
    deleteFamilyLifeRecord,
    toggleRoutineStep,
    toggleSchoolItem,
    voteFamilyPoll,
    toggleFamilyMission,
    addPocketMoneyTransaction
  } = useFamily();
  const isAdult = canManageFamily(activeMember);
  const children = useMemo(
    () =>
      members.filter(
        member =>
          !isManagedProfile(member) &&
          ['child', 'teen'].includes(member.role)
      ),
    [members]
  );
  const [section, setSection] = useState('today');
  const [selectedMemberId, setSelectedMemberId] = useState(
    isChildProfile(activeMember) ? activeMember.id : children[0]?.id || ''
  );
  const selectedMember =
    members.find(member => member.id === selectedMemberId) ||
    (isChildProfile(activeMember) ? activeMember : children[0]) ||
    activeMember;
  const selectedId = selectedMember?.id || '';
  const today = localDateKey();

  useEffect(() => {
    if (isChildProfile(activeMember)) {
      setSelectedMemberId(activeMember.id);
    } else if (!members.some(member => member.id === selectedMemberId)) {
      setSelectedMemberId(children[0]?.id || '');
    }
  }, [activeMember, children, members, selectedMemberId]);

  const [routineForm, setRoutineForm] = useState({
    title: 'Morgenstart',
    timeOfDay: 'morning',
    icon: '☀️',
    steps: 'Aufstehen\nAnziehen\nZähne putzen\nSchulranzen prüfen'
  });
  const [goalForm, setGoalForm] = useState({
    title: '',
    amount: '25',
    icon: '🎯'
  });
  const [moneyForm, setMoneyForm] = useState({
    amount: '2',
    starCost: '0',
    note: 'Taschengeld'
  });
  const [schoolForm, setSchoolForm] = useState({
    kind: 'homework',
    title: '',
    subject: '',
    date: today,
    weekday: String(new Date().getDay()),
    time: '',
    details: ''
  });
  const [pollForm, setPollForm] = useState({
    question: '',
    options: '🍕 Pizza\n🍝 Nudeln\n🥞 Pfannkuchen',
    closesAt: ''
  });
  const [encouragementForm, setEncouragementForm] = useState({
    message: '',
    icon: '💛'
  });
  const [missionForm, setMissionForm] = useState({
    title: '',
    description: '',
    icon: '🤝',
    dueDate: ''
  });
  const settings = familySettings[0] || null;
  const [settingsForm, setSettingsForm] = useState({
    quietHoursEnabled: false,
    quietStart: '20:00',
    quietEnd: '07:00',
    urgentDuringQuietHours: true,
    mediaScheduleEnabled: false,
    mediaStart: '15:00',
    mediaEnd: '19:30',
    emergencyTitle: 'Wichtige Hilfe für unsere Familie',
    emergencyContacts: '',
    emergencyNotes: ''
  });

  useEffect(() => {
    if (!settings) return;
    setSettingsForm({
      quietHoursEnabled: Boolean(settings.quietHoursEnabled),
      quietStart: settings.quietStart || '20:00',
      quietEnd: settings.quietEnd || '07:00',
      urgentDuringQuietHours: settings.urgentDuringQuietHours !== false,
      mediaScheduleEnabled: Boolean(settings.mediaScheduleEnabled),
      mediaStart: settings.mediaStart || '15:00',
      mediaEnd: settings.mediaEnd || '19:30',
      emergencyTitle:
        settings.emergencyTitle || 'Wichtige Hilfe für unsere Familie',
      emergencyContacts: (settings.emergencyContacts || [])
        .map(contact =>
          [contact.name, contact.phone, contact.note].filter(Boolean).join(' | ')
        )
        .join('\n'),
      emergencyNotes: settings.emergencyNotes || ''
    });
  }, [settings?.updatedAt]);

  const myRoutines = dailyRoutines.filter(
    routine => routine.memberId === selectedId && routine.active !== false
  );
  const mySchoolItems = schoolItems.filter(item => item.memberId === selectedId);
  const myTransactions = pocketMoneyTransactions
    .filter(transaction => transaction.memberId === selectedId)
    .sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0));
  const pocketBalance = myTransactions.reduce(
    (sum, transaction) => sum + Number(transaction.amountCents || 0),
    0
  );
  const myGoals = savingsGoals.filter(goal => goal.memberId === selectedId);
  const myEncouragements = encouragements
    .filter(item => item.memberId === selectedId)
    .sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0));
  const myMissions = familyMissions.filter(mission =>
    mission.memberIds?.includes(selectedId)
  );

  const weekKeys = lastSevenDateKeys();
  const completedTasksThisWeek = tasks.filter(task =>
    task.memberId === selectedId &&
    task.completed &&
    weekKeys.some(key =>
      new Date(Number(task.completionApprovedAt || task.createdAt || 0))
        .toLocaleDateString('en-CA') === key
    )
  ).length;
  const routineDays = new Set(
    myRoutines.flatMap(routine =>
      weekKeys.filter(key =>
        (routine.completions?.[key] || []).length === routine.steps?.length
      )
    )
  ).size;
  const participation = familyPolls.filter(
    poll => Boolean(poll.votes?.[selectedId])
  ).length;
  const nextEvent = events
    .filter(event =>
      (!event.memberId ||
        event.memberId === 'all' ||
        event.memberId === selectedId) &&
      (!event.date || event.date >= today)
    )
    .sort((left, right) =>
      `${left.date || ''}${left.time || ''}`.localeCompare(
        `${right.date || ''}${right.time || ''}`
      )
    )[0];
  const achievements = [
    {
      icon: '🌱',
      title: 'Erster Schritt',
      reached: completedTasksThisWeek > 0 || routineDays > 0
    },
    {
      icon: '🔥',
      title: 'Routine-Profi',
      reached: Math.max(0, ...myRoutines.map(routineStreak)) >= 3
    },
    {
      icon: '⭐',
      title: 'Sternensammler',
      reached: Number(selectedMember?.stars || 0) >= 50
    },
    {
      icon: '🤝',
      title: 'Teamgeist',
      reached: myMissions.some(mission =>
        mission.completedMemberIds?.includes(selectedId)
      )
    }
  ];

  const createRoutine = async event => {
    event.preventDefault();
    const steps = routineForm.steps
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map((title, index) => ({
        id: `step-${Date.now()}-${index}`,
        title,
        icon: ['1', '2', '3', '4', '5', '6'][index] || '✓'
      }));
    const created = await addFamilyLifeRecord('dailyRoutines', {
      memberId: selectedId,
      title: routineForm.title,
      icon: routineForm.icon,
      timeOfDay: routineForm.timeOfDay,
      steps
    });
    if (created) setRoutineForm(previous => ({ ...previous, title: '' }));
  };

  const createGoal = async event => {
    event.preventDefault();
    const created = await addFamilyLifeRecord('savingsGoals', {
      memberId: selectedId,
      title: goalForm.title,
      icon: goalForm.icon,
      targetCents: Math.round(Number(goalForm.amount) * 100)
    });
    if (created) setGoalForm(previous => ({ ...previous, title: '' }));
  };

  const bookMoney = async event => {
    event.preventDefault();
    const created = await addPocketMoneyTransaction({
      memberId: selectedId,
      amountCents: Math.round(Number(moneyForm.amount) * 100),
      starCost: Math.max(0, Number(moneyForm.starCost || 0)),
      note: moneyForm.note,
      icon: Number(moneyForm.amount) < 0 ? '🧾' : '💶'
    });
    if (created) {
      setMoneyForm(previous => ({ ...previous, starCost: '0' }));
    }
  };

  const createSchoolItem = async event => {
    event.preventDefault();
    const created = await addFamilyLifeRecord('schoolItems', {
      memberId: selectedId,
      ...schoolForm,
      weekday: Number(schoolForm.weekday)
    });
    if (created) setSchoolForm(previous => ({ ...previous, title: '', details: '' }));
  };

  const createPoll = async event => {
    event.preventDefault();
    const options = pollForm.options
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const match = line.match(/^(\p{Extended_Pictographic})?\s*(.*)$/u);
        return {
          id: `option-${Date.now()}-${index}`,
          emoji: match?.[1] || ['👍', '🎉', '💛'][index] || '✨',
          label: match?.[2] || line
        };
      });
    const created = await addFamilyLifeRecord('familyPolls', {
      question: pollForm.question,
      options,
      closesAt: pollForm.closesAt
    });
    if (created) setPollForm(previous => ({ ...previous, question: '' }));
  };

  const sendEncouragement = async event => {
    event.preventDefault();
    const created = await addFamilyLifeRecord('encouragements', {
      memberId: selectedId,
      message: encouragementForm.message,
      icon: encouragementForm.icon
    });
    if (created) setEncouragementForm(previous => ({ ...previous, message: '' }));
  };

  const createMission = async event => {
    event.preventDefault();
    const created = await addFamilyLifeRecord('familyMissions', {
      title: missionForm.title,
      description: missionForm.description,
      icon: missionForm.icon,
      dueDate: missionForm.dueDate,
      memberIds: children.map(child => child.id)
    });
    if (created) {
      setMissionForm(previous => ({ ...previous, title: '', description: '' }));
    }
  };

  const saveSettings = async event => {
    event.preventDefault();
    const emergencyContacts = settingsForm.emergencyContacts
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const [name = '', phone = '', note = ''] = line
          .split('|')
          .map(value => value.trim());
        return {
          id: `contact-${index}-${name.toLowerCase().replace(/\W+/g, '-')}`,
          name,
          phone,
          note,
          icon: index === 0 ? '🚑' : '☎️'
        };
      });
    const payload = { ...settingsForm, emergencyContacts };
    if (settings) {
      await updateFamilyLifeRecord(
        'familySettings',
        settings.id,
        payload
      );
    } else {
      await addFamilyLifeRecord('familySettings', {
        id: 'family-settings',
        ...payload
      });
    }
  };

  return (
    <div className="family-life">
      <section className="family-life-hero">
        <div className="family-life-hero-copy">
          <span><HeartHandshake size={17} /> Euer Alltag, ein gutes Team</span>
          <h1>Familienreise</h1>
          <p>
            Routinen, Schule, Taschengeld und Entscheidungen greifen hier
            ineinander – verständlich für Kinder, verlässlich für Eltern.
          </p>
        </div>
        <div className="family-life-hero-orbit" aria-hidden="true">
          <i>☀️</i><i>🎒</i><i>⭐</i>
        </div>
        <div className="family-life-person">
          {isAdult && children.length > 0 ? (
            <label>
              <span>Ansicht für</span>
              <select
                value={selectedId}
                onChange={event => setSelectedMemberId(event.target.value)}
              >
                {children.map(child => (
                  <option key={child.id} value={child.id}>{child.name}</option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <span>Deine Reise</span>
              <strong>{selectedMember?.name}</strong>
            </>
          )}
        </div>
      </section>

      <nav className="family-life-nav" aria-label="Bereiche der Familienreise">
        {SECTIONS.map(item => {
          const Icon = item.icon;
          return (
            <button
              type="button"
              key={item.id}
              className={section === item.id ? 'active' : ''}
              onClick={() => setSection(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {section === 'today' && (
        <div className="family-life-section family-weekly">
          <section className="family-life-panel weekly-story">
            <PanelHeader
              kicker="Die letzten sieben Tage"
              title={`Das war ${selectedMember?.name}s Woche`}
              icon={Trophy}
            />
            <div className="weekly-metrics">
              <article><Check /><strong>{completedTasksThisWeek}</strong><span>Missionen</span></article>
              <article><RotateCw /><strong>{routineDays}</strong><span>Routinetage</span></article>
              <article><Vote /><strong>{participation}</strong><span>Abstimmungen</span></article>
              <article><Star /><strong>{selectedMember?.stars || 0}</strong><span>Sterne</span></article>
            </div>
            <div className="weekly-message">
              <span>{completedTasksThisWeek + routineDays >= 5 ? '🏆' : '🌱'}</span>
              <div>
                <strong>
                  {completedTasksThisWeek + routineDays >= 5
                    ? 'Das war eine richtig starke Woche!'
                    : 'Jeder kleine Schritt zählt.'}
                </strong>
                <p>
                  {nextEvent
                    ? `Als Nächstes wartet „${nextEvent.title}“ auf euch.`
                    : 'Der nächste Familienmoment kann ganz spontan entstehen.'}
                </p>
              </div>
            </div>
          </section>

          <section className="family-life-panel achievement-cabinet">
            <PanelHeader kicker="Sammelkabinett" title="Abzeichen" icon={Medal} />
            <div className="achievement-grid">
              {achievements.map(achievement => (
                <article
                  key={achievement.title}
                  className={achievement.reached ? 'reached' : ''}
                >
                  <span>{achievement.icon}</span>
                  <strong>{achievement.title}</strong>
                  <small>{achievement.reached ? 'Gesammelt' : 'Noch geheim'}</small>
                </article>
              ))}
            </div>
          </section>

          <section className="family-life-panel team-missions">
            <PanelHeader kicker="Gemeinsam statt allein" title="Familien-Missionen" icon={UsersRound} />
            <div className="team-mission-list">
              {myMissions.map(mission => {
                const done = mission.completedMemberIds?.includes(selectedId);
                const total = mission.memberIds?.length || 1;
                const completed = mission.completedMemberIds?.length || 0;
                return (
                  <article key={mission.id} className={done ? 'done' : ''}>
                    <button
                      type="button"
                      onClick={() => toggleFamilyMission(mission.id, selectedId)}
                    >
                      <span>{mission.icon || '🤝'}</span>
                      <div>
                        <strong>{mission.title}</strong>
                        <small>{mission.description || `${completed} von ${total} sind dabei`}</small>
                      </div>
                      <i>{done ? <Check size={17} /> : <ChevronRight size={17} />}</i>
                    </button>
                    <div><span style={{ width: `${(completed / total) * 100}%` }} /></div>
                  </article>
                );
              })}
              {!myMissions.length && (
                <div className="family-life-empty">Noch keine gemeinsame Mission.</div>
              )}
            </div>
            {isAdult && children.length > 0 && (
              <Creator title="Neue Familien-Mission">
                <form onSubmit={createMission} className="family-life-form">
                  <input
                    value={missionForm.title}
                    onChange={event => setMissionForm(previous => ({ ...previous, title: event.target.value }))}
                    placeholder="Zum Beispiel: Gemeinsam den Garten retten"
                    required
                  />
                  <textarea
                    value={missionForm.description}
                    onChange={event => setMissionForm(previous => ({ ...previous, description: event.target.value }))}
                    placeholder="Was macht ihr zusammen?"
                  />
                  <div className="emoji-choice">
                    {MISSION_ICONS.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        className={missionForm.icon === icon ? 'active' : ''}
                        onClick={() => setMissionForm(previous => ({ ...previous, icon }))}
                      >{icon}</button>
                    ))}
                  </div>
                  <input
                    type="date"
                    value={missionForm.dueDate}
                    onChange={event => setMissionForm(previous => ({ ...previous, dueDate: event.target.value }))}
                  />
                  <button className="family-life-primary"><Plus size={16} /> Mission starten</button>
                </form>
              </Creator>
            )}
          </section>

          <section className="family-life-panel encouragement-panel">
            <PanelHeader kicker="Kleine Worte, große Wirkung" title="Mutmacher" icon={MessageCircleHeart} />
            {myEncouragements[0] ? (
              <blockquote>
                <span>{myEncouragements[0].icon || '💛'}</span>
                <p>„{myEncouragements[0].message}“</p>
                <footer>– {myEncouragements[0].createdByName || 'Deine Familie'}</footer>
              </blockquote>
            ) : (
              <div className="family-life-empty">Hier wartet bald ein lieber Mutmacher.</div>
            )}
            {isAdult && selectedId && (
              <form onSubmit={sendEncouragement} className="encouragement-form">
                <div className="emoji-choice">
                  {ENCOURAGEMENT_ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      className={encouragementForm.icon === icon ? 'active' : ''}
                      onClick={() => setEncouragementForm(previous => ({ ...previous, icon }))}
                    >{icon}</button>
                  ))}
                </div>
                <input
                  value={encouragementForm.message}
                  onChange={event => setEncouragementForm(previous => ({ ...previous, message: event.target.value }))}
                  placeholder={`Was möchtest du ${selectedMember?.name} sagen?`}
                  required
                />
                <button className="family-life-primary">Senden</button>
              </form>
            )}
          </section>
        </div>
      )}

      {section === 'routines' && (
        <div className="family-life-section routines-workshop">
          <section className="family-life-panel">
            <PanelHeader kicker="Schritt für Schritt" title={`${selectedMember?.name}s Routinen`} icon={AlarmClock} />
            <div className="routine-grid">
              {myRoutines.map(routine => {
                const completed = new Set(routine.completions?.[today] || []);
                const percent = Math.round(
                  (completed.size / Math.max(1, routine.steps?.length || 1)) * 100
                );
                return (
                  <article className="routine-card" key={routine.id}>
                    <header>
                      <span>{routine.icon || '☀️'}</span>
                      <div>
                        <small>{routine.timeOfDay === 'evening' ? 'Abends' : routine.timeOfDay === 'afternoon' ? 'Nachmittags' : 'Morgens'}</small>
                        <h3>{routine.title}</h3>
                      </div>
                      <strong>{percent}%</strong>
                    </header>
                    <div className="routine-track"><span style={{ width: `${percent}%` }} /></div>
                    <div className="routine-steps">
                      {routine.steps?.map(step => (
                        <button
                          type="button"
                          key={step.id}
                          className={completed.has(step.id) ? 'done' : ''}
                          onClick={() => toggleRoutineStep(routine.id, step.id, today)}
                        >
                          <i>{completed.has(step.id) ? <Check size={17} /> : step.icon}</i>
                          <span>{step.title}</span>
                        </button>
                      ))}
                    </div>
                    <footer>
                      <span>🔥 {routineStreak(routine)} Tage in Folge</span>
                      {isAdult && (
                        <button
                          type="button"
                          onClick={() => deleteFamilyLifeRecord('dailyRoutines', routine.id)}
                          aria-label="Routine löschen"
                        ><Trash2 size={15} /></button>
                      )}
                    </footer>
                  </article>
                );
              })}
              {!myRoutines.length && (
                <div className="family-life-empty large">
                  <span>☀️</span>
                  <strong>Noch keine Routine</strong>
                  <p>Ein guter Ablauf nimmt morgens und abends den Stress raus.</p>
                </div>
              )}
            </div>
          </section>
          {isAdult && selectedId && (
            <section className="family-life-panel">
              <PanelHeader kicker="Routinen-Werkstatt" title="Ablauf anlegen" icon={ClipboardList} />
              <form onSubmit={createRoutine} className="family-life-form routine-form">
                <div className="form-row">
                  <input
                    value={routineForm.title}
                    onChange={event => setRoutineForm(previous => ({ ...previous, title: event.target.value }))}
                    placeholder="Name der Routine"
                    required
                  />
                  <select
                    value={routineForm.timeOfDay}
                    onChange={event => setRoutineForm(previous => ({ ...previous, timeOfDay: event.target.value }))}
                  >
                    <option value="morning">Morgens</option>
                    <option value="afternoon">Nachmittags</option>
                    <option value="evening">Abends</option>
                  </select>
                </div>
                <div className="emoji-choice">
                  {ROUTINE_ICONS.map(icon => (
                    <button
                      type="button"
                      key={icon}
                      className={routineForm.icon === icon ? 'active' : ''}
                      onClick={() => setRoutineForm(previous => ({ ...previous, icon }))}
                    >{icon}</button>
                  ))}
                </div>
                <label>
                  <span>Ein Schritt pro Zeile</span>
                  <textarea
                    rows="6"
                    value={routineForm.steps}
                    onChange={event => setRoutineForm(previous => ({ ...previous, steps: event.target.value }))}
                    required
                  />
                </label>
                <button className="family-life-primary"><Plus size={16} /> Routine speichern</button>
              </form>
            </section>
          )}
        </div>
      )}

      {section === 'money' && (
        <div className="family-life-section money-world">
          <section className="family-life-panel pocket-account">
            <PanelHeader kicker="Familienkonto" title={`${selectedMember?.name}s Taschengeld`} icon={Coins} />
            <div className="pocket-balance">
              <span><PiggyBank size={35} /></span>
              <div><small>Aktuelles Guthaben</small><strong>{euro(pocketBalance)}</strong></div>
              <i>{selectedMember?.stars || 0} ⭐ verfügbar</i>
            </div>
            <div className="pocket-ledger">
              {myTransactions.slice(0, 8).map(transaction => (
                <article key={transaction.id}>
                  <span>{transaction.icon || '💶'}</span>
                  <div>
                    <strong>{transaction.note}</strong>
                    <small>
                      {new Date(transaction.createdAt).toLocaleDateString('de-DE')}
                      {transaction.starCost ? ` · ${transaction.starCost} Sterne` : ''}
                    </small>
                  </div>
                  <b className={transaction.amountCents < 0 ? 'minus' : ''}>
                    {transaction.amountCents > 0 ? '+' : ''}{euro(transaction.amountCents)}
                  </b>
                </article>
              ))}
              {!myTransactions.length && (
                <div className="family-life-empty">Das Taschengeldbuch ist noch leer.</div>
              )}
            </div>
          </section>

          <section className="family-life-panel savings-panel">
            <PanelHeader kicker="Wünsche werden sichtbar" title="Sparziele" icon={Target} />
            <div className="saving-goals">
              {myGoals.map(goal => {
                const percent = Math.min(
                  100,
                  Math.round((pocketBalance / Math.max(1, goal.targetCents)) * 100)
                );
                return (
                  <article key={goal.id} style={{ '--goal-color': goal.color }}>
                    <span>{goal.icon || '🎯'}</span>
                    <div>
                      <strong>{goal.title}</strong>
                      <small>{euro(pocketBalance)} von {euro(goal.targetCents)}</small>
                      <div><i style={{ width: `${percent}%` }} /></div>
                    </div>
                    <b>{percent}%</b>
                    {isAdult && (
                      <button
                        type="button"
                        onClick={() => deleteFamilyLifeRecord('savingsGoals', goal.id)}
                        aria-label="Sparziel löschen"
                      ><Trash2 size={14} /></button>
                    )}
                  </article>
                );
              })}
              {!myGoals.length && (
                <div className="family-life-empty">Noch kein Wunsch zum Daraufsparen.</div>
              )}
            </div>
            {isAdult && selectedId && (
              <Creator title="Sparziel hinzufügen">
                <form onSubmit={createGoal} className="family-life-form">
                  <input
                    value={goalForm.title}
                    onChange={event => setGoalForm(previous => ({ ...previous, title: event.target.value }))}
                    placeholder="Worauf wird gespart?"
                    required
                  />
                  <div className="form-row">
                    <input
                      type="number"
                      min="1"
                      step="0.50"
                      value={goalForm.amount}
                      onChange={event => setGoalForm(previous => ({ ...previous, amount: event.target.value }))}
                      aria-label="Zielbetrag in Euro"
                      required
                    />
                    <div className="emoji-choice compact">
                      {GOAL_ICONS.map(icon => (
                        <button
                          type="button"
                          key={icon}
                          className={goalForm.icon === icon ? 'active' : ''}
                          onClick={() => setGoalForm(previous => ({ ...previous, icon }))}
                        >{icon}</button>
                      ))}
                    </div>
                  </div>
                  <button className="family-life-primary">Ziel anlegen</button>
                </form>
              </Creator>
            )}
          </section>

          {isAdult && selectedId && (
            <section className="family-life-panel money-booking">
              <PanelHeader kicker="Nur für Erwachsene" title="Taschengeld buchen" icon={BadgeEuro} />
              <form onSubmit={bookMoney} className="family-life-form">
                <label><span>Betrag in Euro – negativ für Ausgabe</span>
                  <input
                    type="number"
                    step="0.01"
                    value={moneyForm.amount}
                    onChange={event => setMoneyForm(previous => ({ ...previous, amount: event.target.value }))}
                    required
                  />
                </label>
                <label><span>Buchungstext</span>
                  <input
                    value={moneyForm.note}
                    onChange={event => setMoneyForm(previous => ({ ...previous, note: event.target.value }))}
                    required
                  />
                </label>
                <label><span>Dafür Sterne umwandeln (optional)</span>
                  <input
                    type="number"
                    min="0"
                    max={selectedMember?.stars || 0}
                    value={moneyForm.starCost}
                    onChange={event => setMoneyForm(previous => ({ ...previous, starCost: event.target.value }))}
                  />
                </label>
                <button className="family-life-primary"><Coins size={16} /> Sicher buchen</button>
              </form>
            </section>
          )}
        </div>
      )}

      {section === 'school' && (
        <div className="family-life-section school-desk">
          <section className="family-life-panel school-overview">
            <PanelHeader kicker="Alles für den Schultag" title={`${selectedMember?.name}s Schulbereich`} icon={GraduationCap} />
            <div className="school-kind-grid">
              {Object.entries(SCHOOL_KIND).map(([kind, meta]) => {
                const items = mySchoolItems
                  .filter(item => item.kind === kind)
                  .sort((left, right) =>
                    `${left.date || left.weekday}${left.time || ''}`.localeCompare(
                      `${right.date || right.weekday}${right.time || ''}`
                    )
                  );
                return (
                  <section key={kind}>
                    <header><span>{meta.icon}</span><h3>{meta.label}</h3><b>{items.length}</b></header>
                    <div>
                      {items.map(item => (
                        <article key={item.id} className={item.completed ? 'done' : ''}>
                          <button
                            type="button"
                            disabled={!['homework', 'bag'].includes(item.kind)}
                            onClick={() => toggleSchoolItem(item.id)}
                          >
                            <i>{item.completed ? <Check size={15} /> : meta.icon}</i>
                            <span>
                              <strong>{item.title}</strong>
                              <small>
                                {item.subject}
                                {item.date ? ` · ${new Date(`${item.date}T12:00:00`).toLocaleDateString('de-DE')}` : ''}
                                {kind === 'lesson' ? ` · ${WEEKDAYS[item.weekday]}` : ''}
                                {item.time ? ` · ${item.time}` : ''}
                              </small>
                            </span>
                          </button>
                          {isAdult && (
                            <button
                              type="button"
                              onClick={() => deleteFamilyLifeRecord('schoolItems', item.id)}
                              aria-label="Schuleintrag löschen"
                            ><Trash2 size={14} /></button>
                          )}
                        </article>
                      ))}
                      {!items.length && <p>Noch nichts eingetragen.</p>}
                    </div>
                  </section>
                );
              })}
            </div>
          </section>
          {isAdult && selectedId && (
            <section className="family-life-panel">
              <PanelHeader kicker="Einmal eintragen, ruhig bleiben" title="Schuleintrag anlegen" icon={BookOpenCheck} />
              <form onSubmit={createSchoolItem} className="family-life-form">
                <div className="form-row">
                  <select
                    value={schoolForm.kind}
                    onChange={event => setSchoolForm(previous => ({ ...previous, kind: event.target.value }))}
                  >
                    {Object.entries(SCHOOL_KIND).map(([value, meta]) => (
                      <option key={value} value={value}>{meta.icon} {meta.label}</option>
                    ))}
                  </select>
                  <input
                    value={schoolForm.subject}
                    onChange={event => setSchoolForm(previous => ({ ...previous, subject: event.target.value }))}
                    placeholder="Fach"
                  />
                </div>
                <input
                  value={schoolForm.title}
                  onChange={event => setSchoolForm(previous => ({ ...previous, title: event.target.value }))}
                  placeholder="Was steht an?"
                  required
                />
                {schoolForm.kind === 'lesson' ? (
                  <div className="form-row">
                    <select
                      value={schoolForm.weekday}
                      onChange={event => setSchoolForm(previous => ({ ...previous, weekday: event.target.value }))}
                    >
                      {WEEKDAYS.slice(1, 6).map((day, index) => (
                        <option key={day} value={index + 1}>{day}</option>
                      ))}
                    </select>
                    <input
                      type="time"
                      value={schoolForm.time}
                      onChange={event => setSchoolForm(previous => ({ ...previous, time: event.target.value }))}
                    />
                  </div>
                ) : (
                  <input
                    type="date"
                    value={schoolForm.date}
                    onChange={event => setSchoolForm(previous => ({ ...previous, date: event.target.value }))}
                  />
                )}
                <textarea
                  value={schoolForm.details}
                  onChange={event => setSchoolForm(previous => ({ ...previous, details: event.target.value }))}
                  placeholder="Buch, Material oder kurze Notiz"
                />
                <button className="family-life-primary"><Plus size={16} /> Eintragen</button>
              </form>
            </section>
          )}
        </div>
      )}

      {section === 'polls' && (
        <div className="family-life-section poll-studio">
          <section className="family-life-panel">
            <PanelHeader kicker="Jede Stimme zählt" title="Familien-Abstimmungen" icon={Vote} />
            <div className="family-poll-grid">
              {familyPolls
                .slice()
                .sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0))
                .map(poll => {
                  const total = Object.keys(poll.votes || {}).length;
                  const myVote = poll.votes?.[activeMember?.id];
                  return (
                    <article className="family-poll-card" key={poll.id}>
                      <header>
                        <span><Vote size={18} /></span>
                        <div><small>{total} Stimmen</small><h3>{poll.question}</h3></div>
                        {isAdult && (
                          <button
                            type="button"
                            onClick={() => deleteFamilyLifeRecord('familyPolls', poll.id)}
                            aria-label="Abstimmung löschen"
                          ><Trash2 size={14} /></button>
                        )}
                      </header>
                      <div>
                        {poll.options?.map(option => {
                          const votes = Object.values(poll.votes || {})
                            .filter(value => value === option.id).length;
                          const percent = total ? Math.round((votes / total) * 100) : 0;
                          return (
                            <button
                              type="button"
                              key={option.id}
                              className={myVote === option.id ? 'selected' : ''}
                              onClick={() => voteFamilyPoll(poll.id, option.id)}
                            >
                              <span>{option.emoji}</span>
                              <strong>{option.label}</strong>
                              <i><b style={{ width: `${percent}%` }} /></i>
                              <small>{percent}%</small>
                            </button>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              {!familyPolls.length && (
                <div className="family-life-empty large">
                  <span>🗳️</span><strong>Noch keine Abstimmung</strong>
                  <p>Die nächste Essens- oder Ausflugsfrage gehört der ganzen Familie.</p>
                </div>
              )}
            </div>
          </section>
          {isAdult && (
            <section className="family-life-panel">
              <PanelHeader kicker="Schnell entschieden" title="Neue Frage stellen" icon={CircleHelp} />
              <form onSubmit={createPoll} className="family-life-form">
                <input
                  value={pollForm.question}
                  onChange={event => setPollForm(previous => ({ ...previous, question: event.target.value }))}
                  placeholder="Was möchtet ihr gemeinsam entscheiden?"
                  required
                />
                <label><span>Eine Antwort pro Zeile – Emoji ist erlaubt</span>
                  <textarea
                    rows="5"
                    value={pollForm.options}
                    onChange={event => setPollForm(previous => ({ ...previous, options: event.target.value }))}
                    required
                  />
                </label>
                <label><span>Abstimmung endet optional am</span>
                  <input
                    type="date"
                    value={pollForm.closesAt}
                    onChange={event => setPollForm(previous => ({ ...previous, closesAt: event.target.value }))}
                  />
                </label>
                <button className="family-life-primary"><Vote size={16} /> Abstimmung starten</button>
              </form>
            </section>
          )}
        </div>
      )}

      {section === 'safety' && (
        <div className="family-life-section safety-center">
          <section className="family-life-panel emergency-card">
            <PanelHeader kicker="Im Fall der Fälle" title={settings?.emergencyTitle || 'Notfallkarte'} icon={ShieldAlert} />
            <div className="emergency-contact-grid">
              {(settings?.emergencyContacts || []).map(contact => (
                <a key={contact.id} href={contact.phone ? `tel:${contact.phone.replace(/[^\d+]/g, '')}` : undefined}>
                  <span>{contact.icon || '☎️'}</span>
                  <div><strong>{contact.name}</strong><b>{contact.phone}</b><small>{contact.note}</small></div>
                  <ChevronRight size={18} />
                </a>
              ))}
              {!settings?.emergencyContacts?.length && (
                <div className="family-life-empty">Eltern können hier sichere Notfallkontakte hinterlegen.</div>
              )}
            </div>
            {settings?.emergencyNotes && (
              <div className="emergency-notes">
                <ShieldAlert size={18} />
                <p>{settings.emergencyNotes}</p>
              </div>
            )}
          </section>

          <section className="family-life-panel quiet-status">
            <PanelHeader kicker="Geschützte Familienzeit" title="Ruhe- und Medienzeiten" icon={BellOff} />
            <div className="quiet-status-grid">
              <article className={settings?.quietHoursEnabled ? 'active' : ''}>
                <BellOff size={22} />
                <span><strong>Benachrichtigungsruhe</strong><small>
                  {settings?.quietHoursEnabled
                    ? `${settings.quietStart} bis ${settings.quietEnd} Uhr`
                    : 'Nicht aktiviert'}
                </small></span>
              </article>
              <article className={settings?.mediaScheduleEnabled ? 'active' : ''}>
                <Clock3 size={22} />
                <span><strong>Medien-Lounge</strong><small>
                  {settings?.mediaScheduleEnabled
                    ? `${settings.mediaStart} bis ${settings.mediaEnd} Uhr`
                    : 'Immer sichtbar'}
                </small></span>
              </article>
            </div>
            <p className="quiet-explanation">
              Dringende „Brauche Nähe“-Hinweise dürfen auf Wunsch auch während
              der Ruhezeit ankommen. Normale Meldungen bleiben im Familien-Posteingang.
            </p>
          </section>

          {isAdult && (
            <section className="family-life-panel safety-editor">
              <PanelHeader kicker="Nur für Erwachsene" title="Schutzregeln bearbeiten" icon={ShieldAlert} />
              <form onSubmit={saveSettings} className="family-life-form">
                <label className="setting-switch">
                  <input
                    type="checkbox"
                    checked={settingsForm.quietHoursEnabled}
                    onChange={event => setSettingsForm(previous => ({ ...previous, quietHoursEnabled: event.target.checked }))}
                  />
                  <span><strong>Ruhezeit für Benachrichtigungen</strong><small>Normale Push-Meldungen pausieren.</small></span>
                </label>
                <div className="form-row">
                  <label><span>Beginn</span><input type="time" value={settingsForm.quietStart} onChange={event => setSettingsForm(previous => ({ ...previous, quietStart: event.target.value }))} /></label>
                  <label><span>Ende</span><input type="time" value={settingsForm.quietEnd} onChange={event => setSettingsForm(previous => ({ ...previous, quietEnd: event.target.value }))} /></label>
                </div>
                <label className="setting-switch">
                  <input
                    type="checkbox"
                    checked={settingsForm.urgentDuringQuietHours}
                    onChange={event => setSettingsForm(previous => ({ ...previous, urgentDuringQuietHours: event.target.checked }))}
                  />
                  <span><strong>Dringende Hilferufe durchlassen</strong><small>„Brauche Nähe“ bleibt erreichbar.</small></span>
                </label>
                <label className="setting-switch">
                  <input
                    type="checkbox"
                    checked={settingsForm.mediaScheduleEnabled}
                    onChange={event => setSettingsForm(previous => ({ ...previous, mediaScheduleEnabled: event.target.checked }))}
                  />
                  <span><strong>Medienzeiten verwenden</strong><small>YouTube und Spotify nur im Zeitfenster zeigen.</small></span>
                </label>
                <div className="form-row">
                  <label><span>Medien ab</span><input type="time" value={settingsForm.mediaStart} onChange={event => setSettingsForm(previous => ({ ...previous, mediaStart: event.target.value }))} /></label>
                  <label><span>Medien bis</span><input type="time" value={settingsForm.mediaEnd} onChange={event => setSettingsForm(previous => ({ ...previous, mediaEnd: event.target.value }))} /></label>
                </div>
                <hr />
                <label><span>Titel der Notfallkarte</span>
                  <input value={settingsForm.emergencyTitle} onChange={event => setSettingsForm(previous => ({ ...previous, emergencyTitle: event.target.value }))} />
                </label>
                <label><span>Kontakte – Name | Telefonnummer | Hinweis</span>
                  <textarea
                    rows="5"
                    value={settingsForm.emergencyContacts}
                    onChange={event => setSettingsForm(previous => ({ ...previous, emergencyContacts: event.target.value }))}
                    placeholder={'Kinderarzt | 0123 456789 | Impfpass mitnehmen\nOma | 0987 654321 | Darf abholen'}
                  />
                </label>
                <label><span>Wichtige Notizen</span>
                  <textarea
                    rows="4"
                    value={settingsForm.emergencyNotes}
                    onChange={event => setSettingsForm(previous => ({ ...previous, emergencyNotes: event.target.value }))}
                    placeholder="Allergien, Medikamente oder wichtige Hinweise"
                  />
                </label>
                <button className="family-life-primary"><Check size={16} /> Schutzregeln speichern</button>
              </form>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
