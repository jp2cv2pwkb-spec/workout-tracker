'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { WORKOUT_PLAN, KEY_TIPS, getWeekStart, getDayTotalSets, getTotalSetsPerWeek } from '../lib/workoutPlan';
import { Flame, Trophy, TrendingUp, Check, Users, User, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';

const USERS = [
  { id: 'will', name: 'Will' },
  { id: 'gf', name: 'Steph' }, // Change this name to your girlfriend's name
];

export default function Home() {
  const [activeUser, setActiveUser] = useState('will');
  const [selectedDay, setSelectedDay] = useState(null); // null = weekly overview
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const [view, setView] = useState('today'); // 'today' | 'compare' | 'stats'

  // ============ INITIAL LOAD ============
  useEffect(() => {
    loadCompletions();

    // Set today as the default selected day
    const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const todayId = dayMap[new Date().getDay()];
    setSelectedDay(todayId);
  }, []);

  // ============ REALTIME SYNC ============
  useEffect(() => {
    const channel = supabase
      .channel('completions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'completions' },
        () => loadCompletions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadCompletions() {
    setLoading(true);
    const { data, error } = await supabase
      .from('completions')
      .select('*');
    if (!error && data) setCompletions(data);
    setLoading(false);
  }

  // ============ SET TOGGLE ============
  async function toggleSet(dayId, exerciseId, setIndex) {
    const existing = completions.find(
      (c) =>
        c.user_name === activeUser &&
        c.week_start === weekStart &&
        c.day_id === dayId &&
        c.exercise_id === exerciseId &&
        c.set_index === setIndex
    );

    if (existing) {
      // Remove it (optimistic)
      setCompletions((prev) => prev.filter((c) => c.id !== existing.id));
      await supabase.from('completions').delete().eq('id', existing.id);
    } else {
      // Add it (optimistic with temp id)
      const tempId = `temp-${Date.now()}`;
      const newRow = {
        id: tempId,
        user_name: activeUser,
        week_start: weekStart,
        day_id: dayId,
        exercise_id: exerciseId,
        set_index: setIndex,
        completed_at: new Date().toISOString(),
      };
      setCompletions((prev) => [...prev, newRow]);
      const { data } = await supabase
        .from('completions')
        .insert({
          user_name: activeUser,
          week_start: weekStart,
          day_id: dayId,
          exercise_id: exerciseId,
          set_index: setIndex,
        })
        .select()
        .single();
      if (data) {
        setCompletions((prev) =>
          prev.map((c) => (c.id === tempId ? data : c))
        );
      }
    }
  }

  // ============ HELPERS ============
  function isSetDone(userName, dayId, exerciseId, setIndex, week = weekStart) {
    return completions.some(
      (c) =>
        c.user_name === userName &&
        c.week_start === week &&
        c.day_id === dayId &&
        c.exercise_id === exerciseId &&
        c.set_index === setIndex
    );
  }

  function getUserDayProgress(userName, dayId, week = weekStart) {
    const day = WORKOUT_PLAN.find((d) => d.id === dayId);
    if (!day) return { done: 0, total: 0, pct: 0 };
    const total = getDayTotalSets(day);
    const done = completions.filter(
      (c) =>
        c.user_name === userName &&
        c.week_start === week &&
        c.day_id === dayId
    ).length;
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }

  function getUserWeekProgress(userName, week = weekStart) {
    const total = getTotalSetsPerWeek();
    const done = completions.filter(
      (c) => c.user_name === userName && c.week_start === week
    ).length;
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }

  // Streak = consecutive past weeks where the user completed at least 70% of the plan
  function getUserStreak(userName) {
    let streak = 0;
    let cursor = new Date(weekStart);
    while (true) {
      const wk = cursor.toISOString().split('T')[0];
      const { pct } = getUserWeekProgress(userName, wk);
      // For the current week, count it if they've done ANY work
      const isCurrentWeek = wk === weekStart;
      const threshold = isCurrentWeek ? 1 : 50;
      if (pct >= threshold) {
        streak++;
        cursor.setDate(cursor.getDate() - 7);
      } else {
        break;
      }
      if (streak > 52) break; // safety cap
    }
    return streak;
  }

  // Total sets done all-time for a user
  function getUserTotalSets(userName) {
    return completions.filter((c) => c.user_name === userName).length;
  }

  // Days completed (100%) all-time
  function getUserDaysCompleted(userName) {
    const grouped = {};
    completions
      .filter((c) => c.user_name === userName)
      .forEach((c) => {
        const key = `${c.week_start}-${c.day_id}`;
        grouped[key] = (grouped[key] || 0) + 1;
      });
    let count = 0;
    Object.entries(grouped).forEach(([key, doneSets]) => {
      const dayId = key.split('-').pop();
      const day = WORKOUT_PLAN.find((d) => d.id === dayId);
      if (day && doneSets >= getDayTotalSets(day)) count++;
    });
    return count;
  }

  // ============ WEEK NAVIGATION ============
  function shiftWeek(direction) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + direction * 7);
    setWeekStart(d.toISOString().split('T')[0]);
  }

  function formatWeekRange(weekStartStr) {
    const start = new Date(weekStartStr);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const opts = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
  }

  const currentDay = useMemo(
    () => WORKOUT_PLAN.find((d) => d.id === selectedDay),
    [selectedDay]
  );

  const activeUserName = USERS.find((u) => u.id === activeUser)?.name;
  const otherUser = USERS.find((u) => u.id !== activeUser);

  // ============ RENDER ============
  return (
    <div className="min-h-screen" style={{ background: '#FAF6EE' }}>
      {/* HEADER */}
      <header className="sticky top-0 z-20 border-b" style={{ background: '#FAF6EE', borderColor: '#E8DFCE' }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-serif text-2xl tracking-tight" style={{ color: '#1A1612' }}>
            workout-routine
          </h1>
          {/* User toggle */}
          <div className="flex items-center gap-1 rounded-full p-1" style={{ background: '#F0E6D2' }}>
            {USERS.map((u) => (
              <button
                key={u.id}
                onClick={() => setActiveUser(u.id)}
                className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                style={{
                  background: activeUser === u.id ? '#1A1612' : 'transparent',
                  color: activeUser === u.id ? '#FAF6EE' : '#6B5D44',
                }}
              >
                {u.name}
              </button>
            ))}
          </div>
        </div>

        {/* View tabs */}
        <div className="max-w-3xl mx-auto px-4 pb-2 flex gap-1">
          {[
            { id: 'today', label: 'Workout', icon: User },
            { id: 'compare', label: 'Compare', icon: Users },
            { id: 'stats', label: 'Stats', icon: TrendingUp },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = view === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                style={{
                  background: active ? '#1A1612' : 'transparent',
                  color: active ? '#FAF6EE' : '#6B5D44',
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* WEEK NAVIGATOR */}
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <button onClick={() => shiftWeek(-1)} className="p-2 rounded-full hover:bg-black/5">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <div className="text-xs uppercase tracking-wider" style={{ color: '#8A7B5C' }}>
            Week of
          </div>
          <div className="font-medium" style={{ color: '#1A1612' }}>
            {formatWeekRange(weekStart)}
            {weekStart === getWeekStart() && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: '#1A1612', color: '#FAF6EE' }}>
                Now
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => shiftWeek(1)}
          className="p-2 rounded-full hover:bg-black/5"
          disabled={weekStart >= getWeekStart()}
          style={{ opacity: weekStart >= getWeekStart() ? 0.3 : 1 }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <main className="max-w-3xl mx-auto px-4 pb-24">
        {loading && completions.length === 0 ? (
          <div className="flex items-center justify-center py-20" style={{ color: '#8A7B5C' }}>
            <Loader2 className="animate-spin" size={20} />
            <span className="ml-2 text-sm">Syncing...</span>
          </div>
        ) : view === 'today' ? (
          <TodayView
            currentDay={currentDay}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
            activeUser={activeUser}
            activeUserName={activeUserName}
            otherUser={otherUser}
            toggleSet={toggleSet}
            isSetDone={isSetDone}
            getUserDayProgress={getUserDayProgress}
          />
        ) : view === 'compare' ? (
          <CompareView
            getUserDayProgress={getUserDayProgress}
            getUserWeekProgress={getUserWeekProgress}
            activeUser={activeUser}
          />
        ) : (
          <StatsView
            getUserStreak={getUserStreak}
            getUserTotalSets={getUserTotalSets}
            getUserDaysCompleted={getUserDaysCompleted}
            getUserWeekProgress={getUserWeekProgress}
          />
        )}
      </main>
    </div>
  );
}

// ===============================================
// TODAY / WORKOUT VIEW
// ===============================================
function TodayView({
  currentDay,
  selectedDay,
  setSelectedDay,
  activeUser,
  activeUserName,
  otherUser,
  toggleSet,
  isSetDone,
  getUserDayProgress,
}) {
  if (!currentDay) return null;
  const { theme } = currentDay;
  const myProgress = getUserDayProgress(activeUser, currentDay.id);
  const theirProgress = getUserDayProgress(otherUser.id, currentDay.id);

  return (
    <div>
      {/* Day picker */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide -mx-4 px-4">
        {WORKOUT_PLAN.map((d) => {
          const active = d.id === selectedDay;
          return (
            <button
              key={d.id}
              onClick={() => setSelectedDay(d.id)}
              className="flex-shrink-0 px-4 py-3 rounded-lg border-2 transition-all min-w-[100px] text-center"
              style={{
                background: active ? d.theme.bgSoft : '#F2EAD6',
                borderColor: active ? d.theme.accent : 'transparent',
              }}
            >
              <div
                className="text-xs uppercase tracking-wider font-semibold"
                style={{ color: active ? d.theme.accent : '#A89679' }}
              >
                {d.label}
              </div>
              <div
                className="text-xs italic mt-0.5 font-serif"
                style={{ color: active ? d.theme.text : '#A89679' }}
              >
                {d.title}
              </div>
            </button>
          );
        })}
      </div>

      {/* Day card */}
      <div
        className="rounded-2xl p-5 border-l-4"
        style={{ background: theme.bg, borderColor: theme.accent }}
      >
        <div
          className="text-xs uppercase tracking-widest font-semibold mb-1"
          style={{ color: theme.accent }}
        >
          {currentDay.id === 'mon' && 'Monday'}
          {currentDay.id === 'tue' && 'Tuesday'}
          {currentDay.id === 'wed' && 'Wednesday'}
          {currentDay.id === 'thu' && 'Thursday'}
          {currentDay.id === 'fri' && 'Friday'}
          {currentDay.id === 'sat' && 'Saturday'}
          {currentDay.id === 'sun' && 'Sunday'}
        </div>
        <h2 className="font-serif text-3xl mb-1" style={{ color: theme.text }}>
          {currentDay.title}
        </h2>

        {/* Progress bars for both users */}
        <div className="grid grid-cols-2 gap-2 mb-5 mt-4">
          <ProgressBar
            label={`${activeUserName} (you)`}
            pct={myProgress.pct}
            done={myProgress.done}
            total={myProgress.total}
            color={theme.accent}
            bg={theme.bgSoft}
          />
          <ProgressBar
            label={otherUser.name}
            pct={theirProgress.pct}
            done={theirProgress.done}
            total={theirProgress.total}
            color={theme.accent}
            bg={theme.bgSoft}
            faded
          />
        </div>

        {/* Exercises */}
        <div className="space-y-3">
          {currentDay.exercises.map((ex) => (
            <div
              key={ex.id}
              className="rounded-xl p-4"
              style={{ background: theme.bgSoft }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="font-semibold" style={{ color: theme.text }}>
                    {ex.name}
                  </div>
                  <div className="text-sm mt-0.5" style={{ color: theme.text, opacity: 0.65 }}>
                    {ex.sets} {ex.sets === 1 ? 'set' : 'sets'} · {ex.detail}
                  </div>
                </div>
              </div>

              {/* Set bubbles */}
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: ex.sets }).map((_, i) => {
                  const myDone = isSetDone(activeUser, currentDay.id, ex.id, i);
                  const theirDone = isSetDone(otherUser.id, currentDay.id, ex.id, i);
                  return (
                    <button
                      key={i}
                      onClick={() => toggleSet(currentDay.id, ex.id, i)}
                      className="relative flex items-center gap-1.5 px-3 py-2 rounded-full transition-all active:scale-95"
                      style={{
                        background: myDone ? theme.accent : 'rgba(255,255,255,0.6)',
                        color: myDone ? '#fff' : theme.text,
                        border: `1.5px solid ${myDone ? theme.accent : 'rgba(0,0,0,0.08)'}`,
                      }}
                    >
                      {myDone ? <Check size={14} strokeWidth={3} /> : null}
                      <span className="text-sm font-medium">Set {i + 1}</span>
                      {theirDone && (
                        <span
                          className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold"
                          style={{
                            background: myDone ? 'rgba(255,255,255,0.3)' : theme.accent,
                            color: '#fff',
                          }}
                          title={`${otherUser.name} also did this`}
                        >
                          {otherUser.name[0]}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Day complete celebration */}
        {myProgress.pct === 100 && (
          <div
            className="mt-5 rounded-xl p-4 text-center"
            style={{ background: theme.accent, color: '#fff' }}
          >
            <Trophy size={20} className="inline mr-2" />
            <span className="font-serif text-lg">Day complete. Nice work.</span>
          </div>
        )}
      </div>

      {/* Key tips */}
      <div className="mt-8 px-2">
        <div className="text-xs uppercase tracking-widest font-semibold mb-4" style={{ color: '#8A7B5C' }}>
          Key Tips
        </div>
        <ol className="space-y-3">
          {KEY_TIPS.map((tip, i) => (
            <li key={i} className="flex gap-3 text-sm" style={{ color: '#3D3325' }}>
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{ background: '#1A1612', color: '#FAF6EE' }}
              >
                {i + 1}
              </span>
              <span className="flex-1 pt-0.5">{tip}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function ProgressBar({ label, pct, done, total, color, bg, faded }) {
  return (
    <div
      className="rounded-lg p-3"
      style={{ background: bg, opacity: faded ? 0.7 : 1 }}
    >
      <div className="flex justify-between items-baseline mb-2">
        <div className="text-xs font-medium uppercase tracking-wider" style={{ color }}>
          {label}
        </div>
        <div className="text-xs" style={{ color, opacity: 0.7 }}>
          {done}/{total}
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ===============================================
// COMPARE VIEW — side-by-side weekly grid
// ===============================================
function CompareView({ getUserDayProgress, getUserWeekProgress, activeUser }) {
  const willWeek = getUserWeekProgress('will');
  const gfWeek = getUserWeekProgress('gf');

  return (
    <div>
      {/* Weekly totals */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {USERS.map((u) => {
          const week = getUserWeekProgress(u.id);
          const isMe = u.id === activeUser;
          return (
            <div
              key={u.id}
              className="rounded-2xl p-5"
              style={{
                background: isMe ? '#1A1612' : '#F2EAD6',
                color: isMe ? '#FAF6EE' : '#1A1612',
              }}
            >
              <div className="text-xs uppercase tracking-widest opacity-70 mb-1">
                {u.name} {isMe && '(you)'}
              </div>
              <div className="font-serif text-4xl mb-2">{week.pct}%</div>
              <div className="text-sm opacity-70">
                {week.done} / {week.total} sets this week
              </div>
              <div className="h-1.5 rounded-full overflow-hidden mt-3" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${week.pct}%`,
                    background: isMe ? '#FAF6EE' : '#1A1612',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Day-by-day grid */}
      <div className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: '#8A7B5C' }}>
        This Week, Day by Day
      </div>
      <div className="space-y-2">
        {WORKOUT_PLAN.map((day) => {
          const will = getUserDayProgress('will', day.id);
          const gf = getUserDayProgress('gf', day.id);
          return (
            <div
              key={day.id}
              className="rounded-xl p-4 border-l-4"
              style={{ background: day.theme.bgSoft, borderColor: day.theme.accent }}
            >
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <span
                    className="text-xs uppercase tracking-wider font-semibold mr-2"
                    style={{ color: day.theme.accent }}
                  >
                    {day.label}
                  </span>
                  <span className="font-serif text-lg" style={{ color: day.theme.text }}>
                    {day.title}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {USERS.map((u) => {
                  const p = u.id === 'will' ? will : gf;
                  return (
                    <div key={u.id}>
                      <div className="flex justify-between text-xs mb-1" style={{ color: day.theme.text }}>
                        <span className="font-medium">{u.name}</span>
                        <span style={{ opacity: 0.6 }}>{p.done}/{p.total}</span>
                      </div>
                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{ background: 'rgba(0,0,0,0.08)' }}
                      >
                        <div
                          className="h-full transition-all duration-500"
                          style={{ width: `${p.pct}%`, background: day.theme.accent }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===============================================
// STATS VIEW
// ===============================================
function StatsView({ getUserStreak, getUserTotalSets, getUserDaysCompleted, getUserWeekProgress }) {
  return (
    <div className="space-y-6">
      <div className="text-xs uppercase tracking-widest font-semibold" style={{ color: '#8A7B5C' }}>
        All-Time Stats
      </div>

      {USERS.map((u) => {
        const streak = getUserStreak(u.id);
        const totalSets = getUserTotalSets(u.id);
        const daysComplete = getUserDaysCompleted(u.id);
        const thisWeek = getUserWeekProgress(u.id);

        return (
          <div key={u.id} className="rounded-2xl p-5" style={{ background: '#F2EAD6' }}>
            <div className="font-serif text-2xl mb-4" style={{ color: '#1A1612' }}>
              {u.name}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={<Flame size={18} />}
                label="Week Streak"
                value={streak}
                accent="#C97A2B"
              />
              <StatCard
                icon={<Trophy size={18} />}
                label="Days Completed"
                value={daysComplete}
                accent="#4A7C59"
              />
              <StatCard
                icon={<Check size={18} />}
                label="Total Sets"
                value={totalSets}
                accent="#2D4F8A"
              />
              <StatCard
                icon={<TrendingUp size={18} />}
                label="This Week"
                value={`${thisWeek.pct}%`}
                accent="#B84B47"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#FAF6EE' }}>
      <div className="flex items-center gap-2 mb-2" style={{ color: accent }}>
        {icon}
        <span className="text-xs uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <div className="font-serif text-3xl" style={{ color: '#1A1612' }}>
        {value}
      </div>
    </div>
  );
}
