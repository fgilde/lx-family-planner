import React from 'react';
import {
  AlarmClock,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Coins,
  ExternalLink,
  Gift,
  Heart,
  Laugh,
  Meh,
  MessageCircle,
  Music2,
  Palette,
  PiggyBank,
  Play,
  Rocket,
  Sparkles,
  Star,
  Sun,
  Trophy,
  Vote,
  Youtube
} from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';
import {
  DEFAULT_MEMBER_AVATAR,
  handleImgError
} from '../../utils/imageFallback';
import HomeAssistantWidget from './HomeAssistantWidget';
import RewardIcon from '../Tasks/RewardIcon';

const CHILD_WORLDS = {
  space: {
    label: 'Raketenbasis',
    mascot: '🚀',
    buddy: '🛸',
    mission: 'Sternenenergie',
    greeting: 'Bereit zum Abheben?'
  },
  unicorn: {
    label: 'Einhornland',
    mascot: '🦄',
    buddy: '🌈',
    mission: 'Regenbogenkraft',
    greeting: 'Heute wird magisch!'
  },
  fairy: {
    label: 'Feenzauber',
    mascot: '🧚',
    buddy: '✨',
    mission: 'Zauberstaub',
    greeting: 'Der Zauberwald ruft!'
  },
  dino: {
    label: 'Dinowelt',
    mascot: '🦖',
    buddy: '🥚',
    mission: 'Dino-Power',
    greeting: 'Auf ins große Abenteuer!'
  },
  sunshine: {
    label: 'Sonneninsel',
    mascot: '☀️',
    buddy: '🏄',
    mission: 'Sonnenstrahlen',
    greeting: 'Ein guter Tag beginnt!'
  },
  adventure: {
    label: 'Helden-Camp',
    mascot: '🦸',
    buddy: '⚡',
    mission: 'Heldenkraft',
    greeting: 'Deine Mission wartet!'
  }
};

const MOODS = [
  { id: 'super', label: 'Super!', emoji: '🤩', icon: Laugh },
  { id: 'gut', label: 'Gut', emoji: '😊', icon: Sun },
  { id: 'okay', label: 'Geht so', emoji: '😐', icon: Meh },
  { id: 'hilfe', label: 'Brauche Nähe', emoji: '🫶', icon: Heart }
];

const BUDDIES = ['🦊', '🐼', '🦁', '🐲', '🦄', '🤖', '🦖', '🧚'];

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isInTimeWindow(start, end) {
  const [startHour, startMinute] = String(start || '00:00').split(':').map(Number);
  const [endHour, endMinute] = String(end || '00:00').split(':').map(Number);
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const from = startHour * 60 + startMinute;
  const until = endHour * 60 + endMinute;
  return from === until
    ? true
    : from < until
      ? current >= from && current < until
      : current >= from || current < until;
}

export default function ChildDashboard() {
  const {
    activeMember,
    tasks,
    events,
    rewards,
    toggleTask,
    redeemReward,
    setActiveTab,
    addMoodCheckin,
    moodCheckins,
    dashboardLinks,
    dailyRoutines,
    savingsGoals,
    pocketMoneyTransactions,
    familyPolls,
    encouragements,
    familyMissions,
    familySettings,
    kidProfiles,
    homeAssistantEntities,
    toggleRoutineStep,
    voteFamilyPoll,
    toggleFamilyMission,
    updateKidProfile
  } = useFamily();
  const firstName = activeMember?.name?.split(' ')[0] || 'Abenteurer';
  const stars = Number(activeMember?.stars || 0);
  const level = Math.floor(stars / 50) + 1;
  const levelProgress = stars % 50;
  const world =
    CHILD_WORLDS[activeMember?.theme] || CHILD_WORLDS.adventure;
  const allMyTasks = tasks.filter(
    task => task.memberId === activeMember?.id
  );
  const myTasks = allMyTasks.filter(task => !task.completed);
  const completedMissions = allMyTasks.filter(task => task.completed).length;
  const missionProgress = allMyTasks.length
    ? Math.round((completedMissions / allMyTasks.length) * 100)
    : 100;
  const visibleRewards = rewards
    .filter(reward => {
      const target = reward.forMemberId || 'all';
      return target === 'all' || target === activeMember?.id;
    })
    .sort((a, b) => Number(a.costStars || 0) - Number(b.costStars || 0));
  const upcomingEvents = events
    .filter(event =>
      !event.memberId ||
      event.memberId === 'all' ||
      event.memberId === activeMember?.id
    )
    .filter(event => !event.date || event.date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`))
    .slice(0, 3);
  const latestMood = [...moodCheckins]
    .filter(checkin => checkin.memberId === activeMember?.id)
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))[0];
  const myDashboardLinks = dashboardLinks.filter(
    link => link.memberId === activeMember?.id
  );
  const today = localDateKey();
  const myRoutines = dailyRoutines.filter(
    routine =>
      routine.memberId === activeMember?.id &&
      routine.active !== false
  );
  const routineSteps = myRoutines.flatMap(routine => routine.steps || []);
  const completedRoutineSteps = myRoutines.reduce(
    (sum, routine) =>
      sum + new Set(routine.completions?.[today] || []).size,
    0
  );
  const nextRoutine = myRoutines.find(routine =>
    (routine.completions?.[today] || []).length < (routine.steps?.length || 0)
  );
  const nextRoutineStep = nextRoutine?.steps?.find(
    step => !(nextRoutine.completions?.[today] || []).includes(step.id)
  );
  const pocketBalance = pocketMoneyTransactions
    .filter(transaction => transaction.memberId === activeMember?.id)
    .reduce((sum, transaction) => sum + Number(transaction.amountCents || 0), 0);
  const savingGoal = savingsGoals.find(
    goal => goal.memberId === activeMember?.id
  );
  const savingPercent = savingGoal
    ? Math.min(100, Math.round((pocketBalance / savingGoal.targetCents) * 100))
    : 0;
  const activePoll = familyPolls
    .filter(poll => !poll.closesAt || poll.closesAt >= today)
    .sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0))[0];
  const latestEncouragement = encouragements
    .filter(item => item.memberId === activeMember?.id)
    .sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0))[0];
  const myFamilyMissions = familyMissions.filter(mission =>
    mission.memberIds?.includes(activeMember?.id)
  );
  const openFamilyMission = myFamilyMissions.find(
    mission => !mission.completedMemberIds?.includes(activeMember?.id)
  );
  const kidStyle = kidProfiles.find(
    profile => profile.memberId === activeMember?.id
  );
  const familyRules = familySettings[0] || null;
  const mediaAllowed =
    !familyRules?.mediaScheduleEnabled ||
    isInTimeWindow(familyRules.mediaStart, familyRules.mediaEnd);
  const earnedBadges = [
    completedMissions > 0,
    stars >= 50,
    completedRoutineSteps === routineSteps.length && routineSteps.length > 0,
    myFamilyMissions.some(mission =>
      mission.completedMemberIds?.includes(activeMember?.id)
    )
  ].filter(Boolean).length;

  return (
    <div className="child-dashboard">
      <section className="child-hero">
        <div className="child-hero-orbit orbit-one">✦</div>
        <div className="child-hero-orbit orbit-two">●</div>
        <div className="child-world-companions" aria-hidden="true">
          <span>{kidStyle?.buddy || world.buddy}</span>
          <span>{world.mascot}</span>
        </div>
        <div className="child-hero-copy">
          <span className="child-kicker">
            <Sparkles size={16} /> Level {level} · {kidStyle?.heroTitle || world.label}
          </span>
          <h1>Hey {firstName}! {world.greeting}</h1>
          <p>
            Heute gibt es {myTasks.length || 'keine'} Mission
            {myTasks.length === 1 ? '' : 'en'} für dich. Mit jeder erledigten
            Aufgabe wächst dein Sterneschatz.
          </p>
          <div className="child-level-track">
            <span style={{ width: `${(levelProgress / 50) * 100}%` }} />
          </div>
          <small>{50 - levelProgress} Sterne bis Level {level + 1}</small>
          <div className="child-hero-metrics">
            <span>
              <b>{myTasks.length}</b>
              Missionen offen
            </span>
            <span>
              <b>{completedMissions}</b>
              geschafft
            </span>
            <span>
              <b>{missionProgress}%</b>
              {world.mission}
            </span>
          </div>
        </div>
        <div className="child-hero-avatar">
          <span className="child-star-balance">
            <Star fill="currentColor" size={21} /> {stars}
          </span>
          {activeMember?.avatar ? (
            <img
              src={activeMember.avatar}
              onError={event => handleImgError(event, DEFAULT_MEMBER_AVATAR)}
              alt=""
            />
          ) : (
            <span className="child-hero-initial" aria-hidden="true">
              {firstName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="child-avatar-badge"><Trophy size={18} /></span>
        </div>
      </section>

      <section
        className="child-adventure-map"
        style={{ '--mission-progress': `${missionProgress}%` }}
      >
        <div className="child-map-emblem" aria-hidden="true">
          <span>{world.mascot}</span>
          <Rocket size={19} />
        </div>
        <div className="child-map-copy">
          <span className="child-section-kicker">Dein Abenteuerpfad</span>
          <h2>
            {allMyTasks.length
              ? `${completedMissions} von ${allMyTasks.length} Missionen geschafft`
              : 'Heute ist freier Entdeckertag'}
          </h2>
          <div
            className="child-map-track"
            role="progressbar"
            aria-label="Fortschritt der Missionen"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={missionProgress}
          >
            <span />
          </div>
        </div>
        <div className="child-map-goal">
          <span>{missionProgress === 100 ? '🏆' : '🎁'}</span>
          <small>{missionProgress === 100 ? 'Geschafft!' : 'Tagesziel'}</small>
          <strong>
            {missionProgress === 100
              ? 'Du bist heute unschlagbar'
              : `${myTasks.length} Mission${myTasks.length === 1 ? '' : 'en'} bis zum Ziel`}
          </strong>
        </div>
      </section>

      <section className="child-today-deck">
        <button
          type="button"
          className="child-today-card routine"
          onClick={() => {
            if (nextRoutine && nextRoutineStep) {
              toggleRoutineStep(nextRoutine.id, nextRoutineStep.id, today);
            } else {
              setActiveTab('family-life');
            }
          }}
        >
          <span className="child-today-icon"><AlarmClock size={23} /></span>
          <span className="child-today-copy">
            <small>Deine Routine</small>
            <strong>
              {nextRoutineStep?.title || (
                routineSteps.length ? 'Heute komplett geschafft!' : 'Routine entdecken'
              )}
            </strong>
            <i>
              {completedRoutineSteps}/{routineSteps.length || 0} Schritte
            </i>
          </span>
          <span className="child-today-action">
            {nextRoutineStep ? <Check size={18} /> : <ChevronRight size={18} />}
          </span>
        </button>

        <button
          type="button"
          className="child-today-card saving"
          onClick={() => setActiveTab('family-life')}
        >
          <span className="child-today-icon"><PiggyBank size={23} /></span>
          <span className="child-today-copy">
            <small>Dein Sparschwein</small>
            <strong>{savingGoal?.title || 'Noch kein Sparziel'}</strong>
            <i>
              {(pocketBalance / 100).toLocaleString('de-DE', {
                style: 'currency',
                currency: 'EUR'
              })}
              {savingGoal ? ` · ${savingPercent}% geschafft` : ''}
            </i>
          </span>
          <span className="child-today-action"><Coins size={18} /></span>
        </button>

        <button
          type="button"
          className="child-today-card badges"
          onClick={() => setActiveTab('family-life')}
        >
          <span className="child-today-icon"><BadgeCheck size={23} /></span>
          <span className="child-today-copy">
            <small>Deine Sammlung</small>
            <strong>{earnedBadges} Abzeichen entdeckt</strong>
            <i>Neue Erfolge warten auf dich</i>
          </span>
          <span className="child-today-action"><Trophy size={18} /></span>
        </button>
      </section>

      {(latestEncouragement || openFamilyMission || activePoll) && (
        <section className="child-story-strip">
          {latestEncouragement && (
            <article className="child-mutmach-card">
              <span>{latestEncouragement.icon || '💛'}</span>
              <div>
                <small>Mutmacher von {latestEncouragement.createdByName || 'deiner Familie'}</small>
                <strong>„{latestEncouragement.message}“</strong>
              </div>
            </article>
          )}
          {openFamilyMission && (
            <button
              type="button"
              className="child-family-mission-card"
              onClick={() => toggleFamilyMission(openFamilyMission.id)}
            >
              <span>{openFamilyMission.icon || '🤝'}</span>
              <div>
                <small>Gemeinsam stark</small>
                <strong>{openFamilyMission.title}</strong>
              </div>
              <i><Check size={17} /></i>
            </button>
          )}
          {activePoll && (
            <article className="child-quick-poll">
              <header>
                <Vote size={18} />
                <div><small>Deine Stimme zählt</small><strong>{activePoll.question}</strong></div>
              </header>
              <div>
                {activePoll.options?.slice(0, 4).map(option => (
                  <button
                    type="button"
                    key={option.id}
                    className={activePoll.votes?.[activeMember?.id] === option.id ? 'selected' : ''}
                    onClick={() => voteFamilyPoll(activePoll.id, option.id)}
                    title={option.label}
                  >
                    <span>{option.emoji}</span>
                    <small>{option.label}</small>
                  </button>
                ))}
              </div>
            </article>
          )}
        </section>
      )}

      <section className="child-mood-card">
        <div>
          <span className="child-section-kicker">Familienkompass</span>
          <h2>Wie fühlst du dich heute?</h2>
          <p>
            {latestMood
              ? 'Danke, dass du heute schon eingecheckt hast.'
              : 'Ein Klick reicht – deine Familie weiß dann, wie es dir geht.'}
          </p>
        </div>
        <div className="child-mood-options">
          {MOODS.map(mood => (
            <button
              key={mood.id}
              type="button"
              onClick={() => addMoodCheckin(mood.id)}
              className={latestMood?.mood === mood.id ? 'selected' : ''}
            >
              <span>{mood.emoji}</span>
              <strong>{mood.label}</strong>
            </button>
          ))}
        </div>
      </section>

      <div className="child-dashboard-grid">
        <section className="child-panel child-quests">
          <header>
            <div>
              <span className="child-section-kicker">Deine Missionen</span>
              <h2><Trophy size={22} /> Heute Sterne sammeln</h2>
            </div>
            <button onClick={() => setActiveTab('tasks')} type="button">
              Alle <ChevronRight size={16} />
            </button>
          </header>
          <div className="child-quest-list">
            {myTasks.length ? (
              myTasks.slice(0, 5).map((task, index) => (
                <button
                  type="button"
                  className="child-quest"
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                >
                  <span className="child-quest-number">{index + 1}</span>
                  <span className="child-quest-copy">
                    <strong>{task.title}</strong>
                    <small>{task.category || 'Familienmission'}</small>
                  </span>
                  <span className="child-quest-stars">
                    +{task.stars || 10} <Star size={15} fill="currentColor" />
                  </span>
                  <span className="child-quest-check"><Check size={18} /></span>
                </button>
              ))
            ) : (
              <div className="child-empty">
                <span>🏆</span>
                <strong>Alles geschafft!</strong>
                <p>Deine Missionen sind erledigt. Stark gemacht.</p>
              </div>
            )}
          </div>
        </section>

        <section className="child-panel child-rewards">
          <header>
            <div>
              <span className="child-section-kicker">Wunschstation</span>
              <h2><Gift size={22} /> Dein Sterneshop</h2>
            </div>
            <button onClick={() => setActiveTab('tasks')} type="button">
              Shop <ChevronRight size={16} />
            </button>
          </header>
          <div className="child-reward-list">
            {visibleRewards.length ? (
              visibleRewards.slice(0, 3).map(reward => {
                const affordable = stars >= Number(reward.costStars || 0);
                return (
                  <article className="child-reward" key={reward.id}>
                    <RewardIcon
                      value={reward.icon}
                      image={reward.iconImage}
                      label={reward.title}
                    />
                    <div>
                      <strong>{reward.title}</strong>
                      <small>
                        <Star size={13} fill="currentColor" />
                        {reward.costStars} Sterne
                      </small>
                    </div>
                    <button
                      type="button"
                      disabled={!affordable}
                      onClick={() => redeemReward(reward, activeMember.id)}
                    >
                      {affordable ? 'Holen' : 'Sammeln'}
                    </button>
                  </article>
                );
              })
            ) : (
              <div className="child-empty compact">
                <span>🎁</span>
                <p>Noch keine Wünsche im Shop.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {myDashboardLinks.length > 0 && mediaAllowed && (
        <section className="child-media-club">
          <header>
            <div>
              <span className="child-section-kicker">Von deiner Familie freigegeben</span>
              <h2><Play size={23} fill="currentColor" /> Deine Medien-Lounge</h2>
            </div>
            <span className="child-safe-badge">✓ Von Eltern ausgewählt</span>
          </header>
          <div className="child-media-grid">
            {myDashboardLinks.map((link, index) => {
              const isSpotify = link.kind === 'spotify';
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-kind={isSpotify ? 'spotify' : 'youtube'}
                  style={{
                    '--media-accent':
                      link.color || (isSpotify ? '#1db954' : '#ff4f55')
                  }}
                >
                  <span className="child-media-number">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="child-media-play">
                    {isSpotify
                      ? <Music2 size={29} />
                      : <Youtube size={29} fill="currentColor" />}
                  </span>
                  <span className="child-media-copy">
                    <small>
                      {isSpotify ? 'Spotify Playlist' : 'YouTube Kanal'}
                    </small>
                    <strong>{link.title}</strong>
                    <em>{isSpotify ? 'Musik an' : 'Video starten'}</em>
                  </span>
                  <ExternalLink className="child-media-external" size={18} />
                  <span className="child-media-decoration" aria-hidden="true">
                    {isSpotify ? '♫' : '▶'}
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {myDashboardLinks.length > 0 && !mediaAllowed && (
        <section className="child-media-rest">
          <span><Clock3 size={25} /></span>
          <div>
            <small>Medien-Lounge macht gerade Pause</small>
            <strong>
              Ab {familyRules?.mediaStart || '15:00'} Uhr ist sie wieder für dich da.
            </strong>
          </div>
        </section>
      )}

      {homeAssistantEntities.length > 0 && (
        <HomeAssistantWidget
          className="child-home-assistant"
          title="Deine Haus-Kontrollen"
        />
      )}

      <section className="child-buddy-lab">
        <div>
          <span className="child-section-kicker">Deine Welt, deine Wahl</span>
          <h2><Palette size={22} /> Abenteuer-Begleiter</h2>
          <p>
            Wähle, wer dich durch deine Missionen begleitet. Die Auswahl wird
            nur für dein Profil gespeichert.
          </p>
        </div>
        <div className="child-buddy-options">
          {BUDDIES.map(buddy => (
            <button
              type="button"
              key={buddy}
              className={(kidStyle?.buddy || world.buddy) === buddy ? 'selected' : ''}
              onClick={() => updateKidProfile(activeMember.id, {
                buddy,
                heroTitle: kidStyle?.heroTitle || world.label
              })}
            >
              <span>{buddy}</span>
              {(kidStyle?.buddy || world.buddy) === buddy && <Check size={15} />}
            </button>
          ))}
        </div>
      </section>

      <section className="child-family-strip">
        <div className="child-family-card">
          <CalendarDays size={22} />
          <span>
            <small>Als Nächstes</small>
            <strong>
              {upcomingEvents[0]?.title || 'Heute ist alles frei'}
            </strong>
          </span>
          <button type="button" onClick={() => setActiveTab('calendar')}>
            Kalender <ChevronRight size={15} />
          </button>
        </div>
        <div className="child-family-card coral">
          <MessageCircle size={22} />
          <span>
            <small>Familienfunk</small>
            <strong>Sag allen kurz Hallo!</strong>
          </span>
          <button type="button" onClick={() => setActiveTab('chat')}>
            Öffnen <ChevronRight size={15} />
          </button>
        </div>
      </section>
    </div>
  );
}
