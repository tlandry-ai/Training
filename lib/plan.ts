// Shared types, color definitions, and schedule logic for Temple's Summer Plan

export type BlockType =
  | 'CorePower'
  | 'SolidCore'
  | 'Lift'
  | 'Practice'
  | 'Work'
  | 'Run'
  | 'PT'
  | 'Rest'

export interface ScheduleBlock {
  id: string
  label: string
  time: string
  type: BlockType
}

// Color pills — bg + text per the design spec
export const BLOCK_COLORS: Record<
  BlockType,
  { bg: string; text: string; name: string }
> = {
  SolidCore: { bg: '#D6E8D4', text: '#2d5a28', name: 'Solid Core' },
  CorePower: { bg: '#D4E4F5', text: '#1a4a7a', name: 'CorePower' },
  Lift: { bg: '#F5E6D4', text: '#7a3d1a', name: 'Lift' },
  Practice: { bg: '#EBD4F5', text: '#4a1a7a', name: 'Practice' },
  Work: { bg: '#F5F0D4', text: '#7a6a1a', name: 'Work' },
  Run: { bg: '#F5D4D4', text: '#7a1a1a', name: 'Run' },
  PT: { bg: '#D4F5F0', text: '#1a6a5a', name: 'PT' },
  Rest: { bg: '#e8e3da', text: '#837c6f', name: 'Rest' },
}

// Training period: June 22 - August 1, 2026
export const PLAN_START = new Date(2026, 5, 22) // June 22, 2026
export const PLAN_END = new Date(2026, 7, 1) // August 1, 2026

export function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function isInPlan(d: Date): boolean {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return t >= PLAN_START.getTime() && t <= PLAN_END.getTime()
}

// Generate the schedule blocks for a given date based on day of week.
export function getScheduleForDate(d: Date): ScheduleBlock[] {
  const dow = d.getDay() // 0 Sun ... 6 Sat

  // Pre-plan or weekends => Rest Day
  if (!isInPlan(d) || dow === 0 || dow === 6) {
    return [
      { id: 'rest', label: 'Rest Day', time: 'All day', type: 'Rest' },
    ]
  }

  // Mon (1), Wed (3), Fri (5)
  if (dow === 1 || dow === 3 || dow === 5) {
    const blocks: ScheduleBlock[] = [
      { id: 'corepower', label: 'CorePower', time: '5:30 AM', type: 'CorePower' },
      { id: 'lift', label: 'Lift', time: '7:00 – 8:00 AM', type: 'Lift' },
      { id: 'practice', label: 'Gym Practice', time: '8:00 – 10:00 AM', type: 'Practice' },
      { id: 'work', label: 'Work', time: '9:00 AM – 6:00 PM', type: 'Work' },
    ]
    // Wed + Fri also have an evening run
    if (dow === 3 || dow === 5) {
      blocks.push({ id: 'run', label: 'Run', time: '6:30 PM', type: 'Run' })
    }
    return blocks
  }

  // Tue (2), Thu (4)
  if (dow === 2 || dow === 4) {
    return [
      { id: 'solidcore', label: 'Solid Core', time: '5:30 AM', type: 'SolidCore' },
      { id: 'pt', label: 'PT', time: '6:30 AM', type: 'PT' },
      { id: 'practice', label: 'Gym Practice', time: '7:00 – 9:00 AM', type: 'Practice' },
      { id: 'work', label: 'Work', time: '9:00 AM – 6:00 PM', type: 'Work' },
    ]
  }

  return [{ id: 'rest', label: 'Rest Day', time: 'All day', type: 'Rest' }]
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const HABITS = [
  { key: 'sleep', label: 'Sleep', emoji: '💤' },
  { key: 'hydration', label: 'Hydration', emoji: '💧' },
  { key: 'nutrition', label: 'Nutrition', emoji: '🥗' },
  { key: 'focus', label: 'Mental Focus', emoji: '🧠' },
  { key: 'recovery', label: 'Recovery', emoji: '🛁' },
  { key: 'bible', label: 'Bible Study', emoji: '📖' },
]

export const RATING_LABELS = ['', 'Rough', 'Meh', 'OK', 'Good', 'Excellent']

export const GOAL_CATEGORIES = ['Gymnastics', 'Fitness', 'Skills', 'Life']
export const SKILL_EVENTS = ['Bars', 'Beam', 'Floor', 'Vault', 'Conditioning', 'Other']

// Build a list of all dates in a given month (with leading/trailing nulls for grid alignment)
export function getMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const startDow = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month, day))
  }
  return cells
}
