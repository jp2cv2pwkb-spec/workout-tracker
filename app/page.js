'use client';
 
import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { DAYS, DEFAULT_EXERCISES, KEY_TIPS, getWeekStart, generateExerciseId } from '../lib/workoutPlan';
import {
  Flame, Trophy, TrendingUp, Check, Users, User, ChevronLeft, ChevronRight,
  X, Loader2, Pencil, Plus, Trash2, GripVertical, Save,
} from 'lucide-react';
 
const USERS = [
  { id: 'will', name: 'Will' },
  { id: 'gf', name: 'Jenna' }, // Change this name to your girlfriend's name
];
 
export default function Home() {
  const [activeUser, setActiveUser] = useState('will');
  const [selectedDay, setSelectedDay] = useState(null);
  const [completions, setCompletions] = useState([]);
  const [exercises, setExercises] = useState([]); // all exercises across users/days
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const [view, setView] = useState('today');
  const [editingExercise, setEditingExercise] = useState(null); // exercise object being edited
  const [seedingDone, setSeedingDone] = useState(false);
 
  // Default selected day = today
  useEffect(() => {
    const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    setSelectedDay(dayMap[new Date().getDay()]);
  }, []);
 
  // Initial load
  useEffect(() => {
    loadAll();
  }, []);
 
  // Realtime sync for both tables
  useEffect(() => {
    const ch = supabase
      .channel('all-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'completions' }, loadCompletions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exercises' }, loadExercises)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
 
  async function loadAll() {
    setLoading(true);
    await Promise.all([loadCompletions(), loadExercises()]);
    setLoading(false);
  }
 
  async function loadCompletions() {
    const { data } = await supabase.from('completions').select('*');
    if (data) setCompletions(data);
  }
 
  async function loadExercises() {
    const { data } = await supabase.from('exercises').select('*').order('sort_order');
    if (data) {
      setExercises(data);
      // Seed defaults if empty (first run)
      if (data.length === 0 && !seedingDone) {
        setSeedingDone(true);
        await seedDefaults();
      }
    }
  }
 
  async function seedDefaults() {
    const rows = [];
    for (const userId of ['will', 'gf']) {
      for (const day of DAYS) {
        const defaults = DEFAULT_EXERCISES[day.id] || [];
        defaults.forEach((ex, i) => {
          rows.push({
            id: generateExerciseId(),
            user_name: userId,
            day_id: day.id,
            name: ex.name,
            sets: ex.sets,
            detail: ex.detail,
            sort_order: i,
          });
        });
      }
    }
    await supabase.from('exercises').insert(rows);
    await loadExercises();
  }
 
  // ============ SET TOGGLE ============
  async function toggleSet(dayId, exerciseId, setIndex) {
    const existing = completions.find(
      (c) => c.user_name === activeUser && c.week_start === weekStart &&
        c.day_id === dayId && c.exercise_id === exerciseId && c.set_index === setIndex
    );
    if (existing) {
      setCompletions((p) => p.filter((c) => c.id !== existing.id));
      await supabase.from('completions').delete().eq('id', existing.id);
    } else {
      const tempId = `temp-${Date.now()}`;
      setCompletions((p) => [...p, {
        id: tempId, user_name: activeUser, week_start: weekStart,
        day_id: dayId, exercise_id: exerciseId, set_index: setIndex,
      }]);
      const { data } = await supabase.from('completions').insert({
        user_name: activeUser, week_start: weekStart,
        day_id: dayId, exercise_id: exerciseId, set_index: setIndex,
      }).select().single();
      if (data) setCompletions((p) => p.map((c) => (c.id === tempId ? data : c)));
    }
  }
 
  // ============ EXERCISE CRUD ============
  async function saveExercise(exercise) {
    if (exercise._isNew) {
      // INSERT
      const newId = generateExerciseId();
      const dayExercises = getExercisesForDayUser(exercise.day_id, exercise.user_name);
      const maxOrder = dayExercises.reduce((m, e) => Math.max(m, e.sort_order), -1);
      const row = {
        id: newId,
        user_name: exercise.user_name,
        day_id: exercise.day_id,
        name: exercise.name || 'New exercise',
        sets: parseInt(exercise.sets) || 1,
        detail: exercise.detail || '',
        sort_order: maxOrder + 1,
      };
      setExercises((p) => [...p, row]);
      await supabase.from('exercises').insert(row);
    } else {
      // UPDATE
      const updates = {
        name: exercise.name,
        sets: parseInt(exercise.sets) || 1,
        detail: exercise.detail || '',
      };
      setExercises((p) => p.map((e) => (e.id === exercise.id ? { ...e, ...updates } : e)));
      await supabase.from('exercises').update(updates).eq('id', exercise.id);
    }
    setEditingExercise(null);
  }
 
  async function deleteExercise(exercise) {
    if (!confirm(`Delete "${exercise.name}"? This will also clear any check-offs for it.`)) return;
    setExercises((p) => p.filter((e) => e.id !== exercise.id));
    // Also delete any completions for this exercise
    await supabase.from('completions').delete()
      .eq('exercise_id', exercise.id);
    await supabase.from('exercises').delete().eq('id', exercise.id);
    setEditingExercise(null);
  }
 
  async function reorderExercise(exercise, direction) {
    const siblings = getExercisesForDayUser(exercise.day_id, exercise.user_name);
    const idx = siblings.findIndex((e) => e.id === exercise.id);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= siblings.length) return;
    const swap = siblings[newIdx];
    const updates = [
      { id: exercise.id, sort_order: swap.sort_order },
      { id: swap.id, sort_order: exercise.sort_order },
    ];
    setExercises((p) => p.map((e) => {
      const u = updates.find((x) => x.id === e.id);
      return u ? { ...e, sort_order: u.sort_order } : e;
    }));
    for (const u of updates) {
      await supabase.from('exercises').update({ sort_order: u.sort_order }).eq('id', u.id);
    }
  }
 
  // ============ HELPERS ============
  function getExercisesForDayUser(dayId, userId) {
    return exercises
      .filter((e) => e.day_id === dayId && e.user_name === userId)
      .sort((a, b) => a.sort_order - b.sort_order);
  }
 
  function isSetDone(userName, dayId, exerciseId, setIndex, week = weekStart) {
    return completions.some(
      (c) => c.user_name === userName && c.week_start === week &&
        c.day_id === dayId && c.exercise_id === exerciseId && c.set_index === setIndex
    );
  }
 
  function getDayTotal(userId, dayId) {
    return getExercisesForDayUser(dayId, userId).reduce((s, e) => s + e.sets, 0);
  }
 
  function getWeekTotal(userId) {
    return DAYS.reduce((sum, d) => sum + getDayTotal(userId, d.id), 0);
  }
 
  function getUserDayProgress(userName, dayId, week = weekStart) {
    const total = getDayTotal(userName, dayId);
    const dayExerciseIds = getExercisesForDayUser(dayId, userName).map((e) => e.id);
    const done = completions.filter((c) =>
      c.user_name === userName && c.week_start === week && c.day_id === dayId &&
      dayExerciseIds.includes(c.exercise_id)
    ).length;
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }
 
  function getUserWeekProgress(userName, week = weekStart) {
    const total = getWeekTotal(userName);
    const validIds = exercises.filter((e) => e.user_name === userName).map((e) => e.id);
    const done = completions.filter((c) =>
      c.user_name === userName && c.week_start === week && validIds.includes(c.exercise_id)
    ).length;
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }
 
  function getUserStreak(userName) {
    let streak = 0;
    let cursor = new Date(weekStart);
    while (true) {
      const wk = cursor.toISOString().split('T')[0];
      const { pct } = getUserWeekProgress(userName, wk);
      const isCurrentWeek = wk === weekStart;
      const threshold = isCurrentWeek ? 1 : 50;
      if (pct >= threshold) {
        streak++;
        cursor.setDate(cursor.getDate() - 7);
      } else break;
      if (streak > 52) break;
    }
    return streak;
  }
 
  function getUserTotalSets(userName) {
    return completions.filter((c) => c.user_name === userName).length;
  }
 
  function getUserDaysCompleted(userName) {
    const grouped = {};
    completions.filter((c) => c.user_name === userName).forEach((c) => {
      const key = `${c.week_start}|${c.day_id}`;
      grouped[key] = (grouped[key] || 0) + 1;
    });
    let count = 0;
    Object.entries(grouped).forEach(([key, doneSets]) => {
      const [_wk, dayId] = key.split('|');
      const total = getDayTotal(userName, dayId);
      if (total > 0 && doneSets >= total) count++;
    });
    return count;
  }
 
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
 
  const currentDay = useMemo(() => DAYS.find((d) => d.id === selectedDay), [selectedDay]);
  const activeUserName = USERS.find((u) => u.id === activeUser)?.name;
  const otherUser = USERS.find((u) => u.id !== activeUser);
 
  return (
    <div className="min-h-screen" style={{ background: '#FAF6EE' }}>
      {/* HEADER */}
      <header className="sticky top-0 z-20 border-b" style={{ background: '#FAF6EE', borderColor: '#E8DFCE' }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-serif text-2xl tracking-tight" style={{ color: '#1A1612' }}>
            workout-routine
          </h1>
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
 
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <button onClick={() => shiftWeek(-1)} className="p-2 rounded-full hover:bg-black/5">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <div className="text-xs uppercase tracking-wider" style={{ color: '#8A7B5C' }}>Week of</div>
          <div className="font-medium" style={{ color: '#1A1612' }}>
            {formatWeekRange(weekStart)}
            {weekStart === getWeekStart() && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: '#1A1612', color: '#FAF6EE' }}>Now</span>
            )}
          </div>
        </div>
        <button onClick={() => shiftWeek(1)} className="p-2 rounded-full hover:bg-black/5"
          disabled={weekStart >= getWeekStart()}
          style={{ opacity: weekStart >= getWeekStart() ? 0.3 : 1 }}>
          <ChevronRight size={18} />
        </button>
      </div>
 
      <main className="max-w-3xl mx-auto px-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20" style={{ color: '#8A7B5C' }}>
            <Loader2 className="animate-spin" size={20} />
            <span className="ml-2 text-sm">Loading...</span>
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
            getExercisesForDayUser={getExercisesForDayUser}
            onEditExercise={(ex) => setEditingExercise(ex)}
            onAddExercise={(dayId, userId) => setEditingExercise({
              _isNew: true, day_id: dayId, user_name: userId,
              name: '', sets: 3, detail: '',
            })}
            onReorder={reorderExercise}
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
 
      {editingExercise && (
        <EditModal
          exercise={editingExercise}
          onSave={saveExercise}
          onDelete={deleteExercise}
          onClose={() => setEditingExercise(null)}
        />
      )}
    </div>
  );
}
 
// ===============================================
// TODAY VIEW
// ===============================================
function TodayView({
  currentDay, selectedDay, setSelectedDay, activeUser, activeUserName, otherUser,
  toggleSet, isSetDone, getUserDayProgress, getExercisesForDayUser,
  onEditExercise, onAddExercise, onReorder,
}) {
  if (!currentDay) return null;
  const { theme } = currentDay;
  const myProgress = getUserDayProgress(activeUser, currentDay.id);
  const theirProgress = getUserDayProgress(otherUser.id, currentDay.id);
  const myExercises = getExercisesForDayUser(currentDay.id, activeUser);
 
  return (
    <div>
      {/* Day picker */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide -mx-4 px-4">
        {DAYS.map((d) => {
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
              <div className="text-xs uppercase tracking-wider font-semibold"
                style={{ color: active ? d.theme.accent : '#A89679' }}>{d.label}</div>
              <div className="text-xs italic mt-0.5 font-serif"
                style={{ color: active ? d.theme.text : '#A89679' }}>{d.title}</div>
            </button>
          );
        })}
      </div>
 
      <div className="rounded-2xl p-5 border-l-4"
        style={{ background: theme.bg, borderColor: theme.accent }}>
        <div className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: theme.accent }}>
          {dayLongName(currentDay.id)}
        </div>
        <h2 className="font-serif text-3xl mb-1" style={{ color: theme.text }}>{currentDay.title}</h2>
 
        <div className="grid grid-cols-2 gap-2 mb-5 mt-4">
          <ProgressBar label={`${activeUserName} (you)`} pct={myProgress.pct} done={myProgress.done}
            total={myProgress.total} color={theme.accent} bg={theme.bgSoft} />
          <ProgressBar label={otherUser.name} pct={theirProgress.pct} done={theirProgress.done}
            total={theirProgress.total} color={theme.accent} bg={theme.bgSoft} faded />
        </div>
 
        <div className="space-y-3">
          {myExercises.length === 0 && (
            <div className="rounded-xl p-6 text-center" style={{ background: theme.bgSoft, color: theme.text, opacity: 0.7 }}>
              <div className="text-sm">No exercises yet. Add one below.</div>
            </div>
          )}
          {myExercises.map((ex, idx) => (
            <div key={ex.id} className="rounded-xl p-4" style={{ background: theme.bgSoft }}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold" style={{ color: theme.text }}>{ex.name}</div>
                  <div className="text-sm mt-0.5" style={{ color: theme.text, opacity: 0.65 }}>
                    {ex.sets} {ex.sets === 1 ? 'set' : 'sets'}{ex.detail ? ` · ${ex.detail}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => onReorder(ex, -1)} disabled={idx === 0}
                    className="p-1.5 rounded-md hover:bg-black/5 transition-all"
                    style={{ color: theme.text, opacity: idx === 0 ? 0.25 : 0.5 }}
                    title="Move up">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                  </button>
                  <button onClick={() => onReorder(ex, 1)} disabled={idx === myExercises.length - 1}
                    className="p-1.5 rounded-md hover:bg-black/5 transition-all"
                    style={{ color: theme.text, opacity: idx === myExercises.length - 1 ? 0.25 : 0.5 }}
                    title="Move down">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </button>
                  <button onClick={() => onEditExercise(ex)}
                    className="p-1.5 rounded-md hover:bg-black/5 transition-all"
                    style={{ color: theme.text, opacity: 0.6 }}
                    title="Edit">
                    <Pencil size={14} />
                  </button>
                </div>
              </div>
 
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: ex.sets }).map((_, i) => {
                  const myDone = isSetDone(activeUser, currentDay.id, ex.id, i);
                  const theirDone = isSetDone(otherUser.id, currentDay.id, ex.id, i);
                  return (
                    <button key={i} onClick={() => toggleSet(currentDay.id, ex.id, i)}
                      className="relative flex items-center gap-1.5 px-3 py-2 rounded-full transition-all active:scale-95"
                      style={{
                        background: myDone ? theme.accent : 'rgba(255,255,255,0.6)',
                        color: myDone ? '#fff' : theme.text,
                        border: `1.5px solid ${myDone ? theme.accent : 'rgba(0,0,0,0.08)'}`,
                      }}>
                      {myDone ? <Check size={14} strokeWidth={3} /> : null}
                      <span className="text-sm font-medium">Set {i + 1}</span>
                      {theirDone && (
                        <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold"
                          style={{ background: myDone ? 'rgba(255,255,255,0.3)' : theme.accent, color: '#fff' }}
                          title={`${otherUser.name} also did this`}>
                          {otherUser.name[0]}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
 
          {/* Add exercise button */}
          <button
            onClick={() => onAddExercise(currentDay.id, activeUser)}
            className="w-full rounded-xl p-4 flex items-center justify-center gap-2 transition-all hover:opacity-100 border-2 border-dashed"
            style={{
              background: 'transparent',
              borderColor: theme.accent,
              color: theme.accent,
              opacity: 0.7,
            }}
          >
            <Plus size={16} />
            <span className="text-sm font-medium">Add exercise for {activeUserName}</span>
          </button>
        </div>
 
        {myProgress.pct === 100 && myProgress.total > 0 && (
          <div className="mt-5 rounded-xl p-4 text-center" style={{ background: theme.accent, color: '#fff' }}>
            <Trophy size={20} className="inline mr-2" />
            <span className="font-serif text-lg">Day complete. Nice work.</span>
          </div>
        )}
      </div>
 
      <div className="mt-8 px-2">
        <div className="text-xs uppercase tracking-widest font-semibold mb-4" style={{ color: '#8A7B5C' }}>Key Tips</div>
        <ol className="space-y-3">
          {KEY_TIPS.map((tip, i) => (
            <li key={i} className="flex gap-3 text-sm" style={{ color: '#3D3325' }}>
              <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{ background: '#1A1612', color: '#FAF6EE' }}>{i + 1}</span>
              <span className="flex-1 pt-0.5">{tip}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
 
function dayLongName(id) {
  return { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
    fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }[id];
}
 
function ProgressBar({ label, pct, done, total, color, bg, faded }) {
  return (
    <div className="rounded-lg p-3" style={{ background: bg, opacity: faded ? 0.7 : 1 }}>
      <div className="flex justify-between items-baseline mb-2">
        <div className="text-xs font-medium uppercase tracking-wider" style={{ color }}>{label}</div>
        <div className="text-xs" style={{ color, opacity: 0.7 }}>{done}/{total}</div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
 
// ===============================================
// COMPARE VIEW
// ===============================================
function CompareView({ getUserDayProgress, getUserWeekProgress, activeUser }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {USERS.map((u) => {
          const week = getUserWeekProgress(u.id);
          const isMe = u.id === activeUser;
          return (
            <div key={u.id} className="rounded-2xl p-5"
              style={{ background: isMe ? '#1A1612' : '#F2EAD6', color: isMe ? '#FAF6EE' : '#1A1612' }}>
              <div className="text-xs uppercase tracking-widest opacity-70 mb-1">{u.name} {isMe && '(you)'}</div>
              <div className="font-serif text-4xl mb-2">{week.pct}%</div>
              <div className="text-sm opacity-70">{week.done} / {week.total} sets this week</div>
              <div className="h-1.5 rounded-full overflow-hidden mt-3" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <div className="h-full transition-all duration-500"
                  style={{ width: `${week.pct}%`, background: isMe ? '#FAF6EE' : '#1A1612' }} />
              </div>
            </div>
          );
        })}
      </div>
 
      <div className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: '#8A7B5C' }}>
        This Week, Day by Day
      </div>
      <div className="space-y-2">
        {DAYS.map((day) => {
          const will = getUserDayProgress('will', day.id);
          const gf = getUserDayProgress('gf', day.id);
          return (
            <div key={day.id} className="rounded-xl p-4 border-l-4"
              style={{ background: day.theme.bgSoft, borderColor: day.theme.accent }}>
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <span className="text-xs uppercase tracking-wider font-semibold mr-2"
                    style={{ color: day.theme.accent }}>{day.label}</span>
                  <span className="font-serif text-lg" style={{ color: day.theme.text }}>{day.title}</span>
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
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
                        <div className="h-full transition-all duration-500"
                          style={{ width: `${p.pct}%`, background: day.theme.accent }} />
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
      <div className="text-xs uppercase tracking-widest font-semibold" style={{ color: '#8A7B5C' }}>All-Time Stats</div>
      {USERS.map((u) => {
        const streak = getUserStreak(u.id);
        const totalSets = getUserTotalSets(u.id);
        const daysComplete = getUserDaysCompleted(u.id);
        const thisWeek = getUserWeekProgress(u.id);
        return (
          <div key={u.id} className="rounded-2xl p-5" style={{ background: '#F2EAD6' }}>
            <div className="font-serif text-2xl mb-4" style={{ color: '#1A1612' }}>{u.name}</div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<Flame size={18} />} label="Week Streak" value={streak} accent="#C97A2B" />
              <StatCard icon={<Trophy size={18} />} label="Days Completed" value={daysComplete} accent="#4A7C59" />
              <StatCard icon={<Check size={18} />} label="Total Sets" value={totalSets} accent="#2D4F8A" />
              <StatCard icon={<TrendingUp size={18} />} label="This Week" value={`${thisWeek.pct}%`} accent="#B84B47" />
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
        {icon}<span className="text-xs uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <div className="font-serif text-3xl" style={{ color: '#1A1612' }}>{value}</div>
    </div>
  );
}
 
// ===============================================
// EDIT MODAL
// ===============================================
function EditModal({ exercise, onSave, onDelete, onClose }) {
  const [draft, setDraft] = useState(exercise);
  const ownerName = USERS.find((u) => u.id === exercise.user_name)?.name;
 
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl"
        style={{ background: '#FAF6EE' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#E8DFCE' }}>
          <h3 className="font-serif text-xl" style={{ color: '#1A1612' }}>
            {exercise._isNew ? 'New exercise' : 'Edit exercise'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-black/5">
            <X size={20} />
          </button>
        </div>
 
        <div className="p-5 space-y-4">
          <div className="text-xs uppercase tracking-wider" style={{ color: '#8A7B5C' }}>
            For: <span className="font-semibold" style={{ color: '#1A1612' }}>{ownerName}</span> · {dayLongName(exercise.day_id)}
          </div>
 
          <div>
            <label className="text-xs uppercase tracking-wider font-semibold mb-1.5 block" style={{ color: '#6B5D44' }}>
              Exercise name
            </label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g., Push-Ups"
              className="w-full px-3 py-2.5 rounded-lg border outline-none focus:border-black"
              style={{ background: '#fff', borderColor: '#E8DFCE', color: '#1A1612' }}
              autoFocus
            />
          </div>
 
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wider font-semibold mb-1.5 block" style={{ color: '#6B5D44' }}>
                Sets
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={draft.sets}
                onChange={(e) => setDraft({ ...draft, sets: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border outline-none focus:border-black"
                style={{ background: '#fff', borderColor: '#E8DFCE', color: '#1A1612' }}
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider font-semibold mb-1.5 block" style={{ color: '#6B5D44' }}>
                Reps / detail
              </label>
              <input
                type="text"
                value={draft.detail}
                onChange={(e) => setDraft({ ...draft, detail: e.target.value })}
                placeholder="10–15 or 30 sec"
                className="w-full px-3 py-2.5 rounded-lg border outline-none focus:border-black"
                style={{ background: '#fff', borderColor: '#E8DFCE', color: '#1A1612' }}
              />
            </div>
          </div>
        </div>
 
        <div className="flex items-center justify-between p-5 border-t" style={{ borderColor: '#E8DFCE' }}>
          {!exercise._isNew ? (
            <button
              onClick={() => onDelete(exercise)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ color: '#B84B47' }}
            >
              <Trash2 size={14} /> Delete
            </button>
          ) : <div />}
          <button
            onClick={() => onSave(draft)}
            disabled={!draft.name?.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: '#1A1612',
              color: '#FAF6EE',
              opacity: !draft.name?.trim() ? 0.4 : 1,
            }}
          >
            <Save size={14} /> Save
          </button>
        </div>
      </div>
    </div>
  );
}
 
