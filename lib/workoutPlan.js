// Day metadata (titles, colors). Actual exercises are now stored in the database
// and editable from the app UI.
 
export const DAYS = [
  {
    id: 'mon',
    label: 'Mon',
    title: 'Upper Body',
    theme: { bg: '#F5DDB8', bgSoft: '#FBEDD5', accent: '#C97A2B', text: '#3D2817' },
  },
  {
    id: 'tue',
    label: 'Tue',
    title: 'Lower Body',
    theme: { bg: '#D4E5D2', bgSoft: '#E8F1E6', accent: '#4A7C59', text: '#1F3A2B' },
  },
  {
    id: 'wed',
    label: 'Wed',
    title: 'Rest / Stretch',
    theme: { bg: '#D9CFE8', bgSoft: '#ECE5F2', accent: '#7A5FA8', text: '#2E1F47' },
  },
  {
    id: 'thu',
    label: 'Thu',
    title: 'Core & Cardio',
    theme: { bg: '#F4D0CD', bgSoft: '#FBE5E3', accent: '#B84B47', text: '#4A1815' },
  },
  {
    id: 'fri',
    label: 'Fri',
    title: 'Full Body',
    theme: { bg: '#CFDAED', bgSoft: '#E5EBF5', accent: '#2D4F8A', text: '#142847' },
  },
  {
    id: 'sat',
    label: 'Sat',
    title: 'Active Rest',
    theme: { bg: '#F0DDB0', bgSoft: '#F8ECCE', accent: '#A87C2E', text: '#3D2A0F' },
  },
  {
    id: 'sun',
    label: 'Sun',
    title: 'Full Rest',
    theme: { bg: '#D4DCD0', bgSoft: '#E6EBE3', accent: '#5A6B52', text: '#222A1F' },
  },
];
 
// Default exercises used to seed the database on first run.
// Once seeded, edits happen in-app and these defaults are ignored.
export const DEFAULT_EXERCISES = {
  mon: [
    { name: 'Push-Ups', sets: 3, detail: '10–15' },
    { name: 'Tricep Dips', sets: 3, detail: '12' },
    { name: 'Arm Circles', sets: 2, detail: '30 sec each direction' },
    { name: 'Plank', sets: 3, detail: '20–30 sec' },
    { name: 'Superman Hold', sets: 3, detail: '10' },
  ],
  tue: [
    { name: 'Bodyweight Squats', sets: 3, detail: '15–20' },
    { name: 'Reverse Lunges', sets: 3, detail: '10 each leg' },
    { name: 'Glute Bridges', sets: 3, detail: '15' },
    { name: 'Calf Raises', sets: 3, detail: '20' },
    { name: 'Wall Sit', sets: 3, detail: '30 sec' },
  ],
  wed: [
    { name: 'Full Body Stretch', sets: 1, detail: '10–15 min' },
    { name: 'Light Walk', sets: 1, detail: '20–30 min' },
  ],
  thu: [
    { name: 'High Knees', sets: 3, detail: '30 sec' },
    { name: 'Bicycle Crunches', sets: 3, detail: '15 each side' },
    { name: 'Leg Raises', sets: 3, detail: '12' },
    { name: 'Mountain Climbers', sets: 3, detail: '20 sec' },
    { name: 'Dead Bug', sets: 3, detail: '8 each side' },
  ],
  fri: [
    { name: 'Squat to Press', sets: 3, detail: '12' },
    { name: 'Push-Up to T', sets: 3, detail: '8 each side' },
    { name: 'Reverse Lunge + Knee Drive', sets: 3, detail: '10 each leg' },
    { name: 'Plank Hip Dips', sets: 3, detail: '12 each side' },
    { name: 'Burpee (Modified)', sets: 3, detail: '8' },
  ],
  sat: [
    { name: 'Dance / Zumba', sets: 1, detail: '20–30 min' },
    { name: 'Yoga Flow', sets: 1, detail: '15–20 min' },
  ],
  sun: [
    { name: 'Full Rest', sets: 1, detail: 'Take the day off' },
  ],
};
 
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
 
// Generate a simple unique id for new exercises
export function generateExerciseId() {
  return 'ex_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
 
