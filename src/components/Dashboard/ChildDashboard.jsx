import React from 'react';
import {
  CalendarDays,
  Check,
  ChevronRight,
  ExternalLink,
  Gift,
  Heart,
  Laugh,
  Meh,
  MessageCircle,
  Sparkles,
  Star,
  Sun,
  Trophy,
  Youtube
} from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';

const MOODS = [
  { id: 'super', label: 'Super!', emoji: '🤩', icon: Laugh },
  { id: 'gut', label: 'Gut', emoji: '😊', icon: Sun },
  { id: 'okay', label: 'Geht so', emoji: '😐', icon: Meh },
  { id: 'hilfe', label: 'Brauche Nähe', emoji: '🫶', icon: Heart }
];

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
    dashboardLinks
  } = useFamily();
  const firstName = activeMember?.name?.split(' ')[0] || 'Abenteurer';
  const stars = Number(activeMember?.stars || 0);
  const level = Math.floor(stars / 50) + 1;
  const levelProgress = stars % 50;
  const myTasks = tasks.filter(
    task => task.memberId === activeMember?.id && !task.completed
  );
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

  return (
    <div className="child-dashboard">
      <section className="child-hero">
        <div className="child-hero-orbit orbit-one">✦</div>
        <div className="child-hero-orbit orbit-two">●</div>
        <div className="child-hero-copy">
          <span className="child-kicker">
            <Sparkles size={16} /> Level {level} · Familienheld
          </span>
          <h1>Hey {firstName}, dein Abenteuer wartet!</h1>
          <p>
            Heute gibt es {myTasks.length || 'keine'} Mission
            {myTasks.length === 1 ? '' : 'en'} für dich. Mit jeder erledigten
            Aufgabe wächst dein Sterneschatz.
          </p>
          <div className="child-level-track">
            <span style={{ width: `${(levelProgress / 50) * 100}%` }} />
          </div>
          <small>{50 - levelProgress} Sterne bis Level {level + 1}</small>
        </div>
        <div className="child-hero-avatar">
          <span className="child-star-balance">
            <Star fill="currentColor" size={21} /> {stars}
          </span>
          <img src={activeMember?.avatar} alt="" />
          <span className="child-avatar-badge"><Trophy size={18} /></span>
        </div>
      </section>

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
                    <span>{reward.icon || '🎁'}</span>
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

      {myDashboardLinks.length > 0 && (
        <section className="child-media-club">
          <header>
            <div>
              <span className="child-section-kicker">Von deiner Familie freigegeben</span>
              <h2><Youtube size={23} /> Deine Lieblingskanäle</h2>
            </div>
            <span className="child-safe-badge">Sicher ausgewählt</span>
          </header>
          <div className="child-media-grid">
            {myDashboardLinks.map((link, index) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ '--media-accent': link.color || '#ff4f55' }}
              >
                <span className="child-media-number">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="child-media-play">
                  <Youtube size={27} fill="currentColor" />
                </span>
                <span>
                  <small>YouTube</small>
                  <strong>{link.title}</strong>
                </span>
                <ExternalLink size={18} />
              </a>
            ))}
          </div>
        </section>
      )}

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
