// Workout plan data — matches the design from the screenshots
// Each day has its own color theme

export const WORKOUT_PLAN = [
  {
    id: 'mon',
    label: 'Mon',
    title: 'Upper Body',
    theme: {
      bg: '#F5DDB8',
      bgSoft: '#FBEDD5',
      accent: '#C97A2B',
      text: '#3D2817',
    },
    exercises: [
      { id: 'pushups', name: 'Push-Ups', sets: 3, detail: '10–15' },
      { id: 'tricep_dips', name: 'Tricep Dips', sets: 3, detail: '12' },
      { id: 'arm_circles', name: 'Arm Circles', sets: 2, detail: '30 sec each direction' },
      { id: 'plank', name: 'Plank', sets: 3, detail: '20–30 sec' },
      { id: 'superman', name: 'Superman Hold', sets: 3, detail: '10' },
    ],
  },
  {
    id: 'tue',
    label: 'Tue',
    title: 'Lower Body',
    theme: {
      bg: '#D4E5D2',
      bgSoft: '#E8F1E6',
      accent: '#4A7C59',
      text: '#1F3A2B',
    },
    exercises: [
      { id: 'squats', name: 'Bodyweight Squats', sets: 3, detail: '15–20' },
      { id: 'lunges', name: 'Reverse Lunges', sets: 3, detail: '10 each leg' },
      { id: 'glute_bridges', name: 'Glute Bridges', sets: 3, detail: '15' },
      { id: 'calf_raises', name: 'Calf Raises', sets: 3, detail: '20' },
      { id: 'wall_sit', name: 'Wall Sit', sets: 3, detail: '30 sec' },
    ],
  },
  {
    id: 'wed',
    label: 'Wed',
    title: 'Rest / Stretch',
    theme: {
      bg: '#D9CFE8',
      bgSoft: '#ECE5F2',
      accent: '#7A5FA8',
      text: '#2E1F47',
    },
    exercises: [
      { id: 'full_stretch', name: 'Full Body Stretch', sets: 1, detail: '10–15 min' },
      { id: 'light_walk', name: 'Light Walk', sets: 1, detail: '20–30 min' },
    ],
  },
  {
    id: 'thu',
    label: 'Thu',
    title: 'Core & Cardio',
    theme: {
      bg: '#F4D0CD',
      bgSoft: '#FBE5E3',
      accent: '#B84B47',
      text: '#4A1815',
    },
    exercises: [
      { id: 'high_knees', name: 'High Knees', sets: 3, detail: '30 sec' },
      { id: 'bicycle', name: 'Bicycle Crunches', sets: 3, detail: '15 each side' },
      { id: 'leg_raises', name: 'Leg Raises', sets: 3, detail: '12' },
      { id: 'mountain_climbers', name: 'Mountain Climbers', sets: 3, detail: '20 sec' },
      { id: 'dead_bug', name: 'Dead Bug', sets: 3, detail: '8 each side' },
    ],
  },
  {
    id: 'fri',
    label: 'Fri',
    title: 'Full Body',
    theme: {
      bg: '#CFDAED',
      bgSoft: '#E5EBF5',
      accent: '#2D4F8A',
      text: '#142847',
    },
    exercises: [
      { id: 'squat_press', name: 'Squat to Press', sets: 3, detail: '12' },
      { id: 'pushup_t', name: 'Push-Up to T', sets: 3, detail: '8 each side' },
      { id: 'lunge_knee', name: 'Reverse Lunge + Knee Drive', sets: 3, detail: '10 each leg' },
      { id: 'plank_hip_dips', name: 'Plank Hip Dips', sets: 3, detail: '12 each side' },
      { id: 'burpee', name: 'Burpee (Modified)', sets: 3, detail: '8' },
    ],
  },
  {
    id: 'sat',
    label: 'Sat',
    title: 'Active Rest',
    theme: {
      bg: '#F0DDB0',
      bgSoft: '#F8ECCE',
      accent: '#A87C2E',
      text: '#3D2A0F',
    },
    exercises: [
      { id: 'dance', name: 'Dance / Zumba', sets: 1, detail: '20–30 min' },
      { id: 'yoga', name: 'Yoga Flow', sets: 1, detail: '15–20 min' },
    ],
  },
  {
    id: 'sun',
    label: 'Sun',
    title: 'Full Rest',
    theme: {
      bg: '#D4DCD0',
      bgSoft: '#E6EBE3',
      accent: '#5A6B52',
      text: '#222A1F',
    },
    exercises: [
      { id: 'full_rest', name: 'Full Rest', sets: 1, detail: 'Take the day off' },
    ],
  },
];

export const KEY_TIPS = [
  'Aim for 3–4 days of actual workouts per week — this plan has exactly that.',
  'Each workout takes 20–30 minutes. Quality over quantity.',
  'Protein matters: aim for ~0.6–0.8g per lb of body weight to support toning.',
  'Toning = building lean muscle + lowering body fat. Both matter.',
  'Progress by adding reps or slowing down each movement — no weights needed.',
  'Soreness is normal at first. If something hurts sharply, stop.',
];

// Helper: get current week's Monday in YYYY-MM-DD format
export function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

// Helper: get total sets across the whole week
export function getTotalSetsPerWeek() {
  return WORKOUT_PLAN.reduce(
    (total, day) => total + day.exercises.reduce((s, ex) => s + ex.sets, 0),
    0
  );
}

// Helper: total sets in a single day
export function getDayTotalSets(day) {
  return day.exercises.reduce((s, ex) => s + ex.sets, 0);
}
