// Josie Cahn's "Strength & Recomposition" plan for Temple — static reference data.
// Source: coaching PDF, 7.18.26.

export const COACH = {
  name: 'Josie Cahn',
  date: '7.18.26',
  title: 'Strength & Recomposition',
} as const

// ---------- Nutrition targets ----------
// Calories are a range; macros are single targets.
export const MACRO_TARGETS = {
  caloriesLow: 2000,
  caloriesHigh: 2200,
  protein: 130, // g
  carbs: 275, // g
  fat: 60, // g
} as const

export const DAILY_PRIORITIES = [
  'Hit protein goal',
  'Fuel around training',
  'Consistency',
  'Stay hydrated',
  'Sleep!',
]

// ---------- Food guide ----------
export interface FoodGroup {
  key: 'protein' | 'carbs' | 'fats'
  label: string
  accent: string // css var for the ink-toned accent
  items: { name: string; note?: string }[]
}

export const FOOD_GUIDE: FoodGroup[] = [
  {
    key: 'protein',
    label: 'Protein',
    accent: 'var(--green-ink)',
    items: [
      { name: 'Chicken', note: "Kevin's is a quick, tasty option" },
      { name: 'Turkey' },
      { name: 'Beef patties' },
      { name: 'Lean ground beef' },
      { name: 'Eggs, egg whites' },
      { name: 'Chicken sausage' },
      { name: 'Steak' },
      { name: 'Greek yogurt' },
      { name: 'Cottage cheese' },
      { name: 'Protein powder', note: 'Just Ingredients strawberries & cream' },
    ],
  },
  {
    key: 'carbs',
    label: 'Carbs',
    accent: 'var(--blue-ink)',
    items: [
      { name: 'Rice' },
      { name: 'Potatoes / sweet potatoes' },
      { name: 'Fruit' },
      { name: 'Sourdough bread' },
      { name: 'Pasta', note: 'Goodles, Miracle noodles are favs' },
      { name: 'Rice cakes' },
      { name: 'Low-carb tortillas' },
    ],
  },
  {
    key: 'fats',
    label: 'Healthy fats',
    accent: 'var(--rose-ink)',
    items: [
      { name: 'Avocado' },
      { name: 'Peanut butter', note: 'Ingredients should be just peanuts + salt' },
      { name: 'Olive oil' },
      { name: 'Dark chocolate' },
    ],
  },
]

// ---------- Sample day of eating ----------
export const SAMPLE_DAY: { meal: string; text: string }[] = [
  {
    meal: 'Pre-workout',
    text: '1 piece of sourdough toast with peanut butter & honey',
  },
  {
    meal: 'Breakfast',
    text: '170g nonfat Greek yogurt with a scoop of protein, strawberries, blueberries, ½ banana, crushed cinnamon rice cake',
  },
  {
    meal: 'Lunch',
    text: 'Chicken poke-style bowl: grilled chicken over rice, edamame, cucumber, carrots, avocado, lite spicy mayo drizzle, sesame seeds',
  },
  {
    meal: 'Snack',
    text: 'Half an everything bagel with cream cheese + lox (or turkey)',
  },
  {
    meal: 'Dinner',
    text: 'Sweet potato bun burgers + Goodles',
  },
  {
    meal: 'Sweet treat',
    text: 'Dark chocolate',
  },
]

// ---------- Grocery list (defaults / seed) ----------
export interface GrocerySeedItem {
  name: string
  category: string
}

export const GROCERY_CATEGORIES = [
  'Proteins',
  'Fruits & Veggies',
  'Carbs',
  'Other',
] as const

export const GROCERY_SEED: GrocerySeedItem[] = [
  { name: '93% lean ground turkey', category: 'Proteins' },
  { name: 'Chicken breast', category: 'Proteins' },
  { name: 'Steak', category: 'Proteins' },
  { name: 'Beef patties', category: 'Proteins' },
  { name: 'Chicken sausage', category: 'Proteins' },
  { name: 'Greek yogurt', category: 'Proteins' },
  { name: 'Cottage cheese', category: 'Proteins' },
  { name: 'Berries', category: 'Fruits & Veggies' },
  { name: 'Bananas', category: 'Fruits & Veggies' },
  { name: 'Brussel sprouts', category: 'Fruits & Veggies' },
  { name: 'Broccoli', category: 'Fruits & Veggies' },
  { name: 'Onions', category: 'Fruits & Veggies' },
  { name: 'Bell peppers', category: 'Fruits & Veggies' },
  { name: 'Avocado', category: 'Fruits & Veggies' },
  { name: 'Sourdough', category: 'Carbs' },
  { name: 'Potatoes / sweet potatoes', category: 'Carbs' },
  { name: 'Rice', category: 'Carbs' },
  { name: 'Protein pasta', category: 'Carbs' },
  { name: 'Dark chocolate', category: 'Other' },
  { name: 'Peanut butter', category: 'Other' },
  { name: 'Dip (healthy option)', category: 'Other' },
  { name: 'Coconut water', category: 'Other' },
  { name: 'Rice cakes', category: 'Other' },
  { name: 'Pretzel crisps', category: 'Other' },
  { name: 'Low-carb tortillas', category: 'Other' },
]

// ---------- Training schedule ----------
export const TRAINING_SCHEDULE: { day: string; focus: string }[] = [
  { day: 'Monday', focus: 'Glutes / Hamstrings' },
  { day: 'Tuesday', focus: 'Solidcore' },
  { day: 'Wednesday', focus: 'Upper body (alternate)' },
  { day: 'Thursday', focus: 'Solidcore' },
  { day: 'Friday', focus: 'Glutes / Quads' },
  { day: 'Saturday', focus: 'Active rest (walk a lot)' },
]

// ---------- Workout library ----------
export interface Exercise {
  name: string
  sets: string
  reps: string
}
export interface WorkoutDay {
  key: string
  label: string
  exercises: Exercise[]
}

export const WORKOUTS: WorkoutDay[] = [
  {
    key: 'glutes-hamstrings',
    label: 'Glutes / Hamstrings',
    exercises: [
      { name: 'Hip thrusts', sets: '3 working', reps: '6-8' },
      { name: 'Single leg hip thrusts', sets: '2', reps: '8-10' },
      { name: 'Glute focused back extensions', sets: '3', reps: '8-10' },
      { name: 'Hip abductors', sets: '4', reps: '10-12' },
    ],
  },
  {
    key: 'quads-glutes',
    label: 'Quads / Glutes',
    exercises: [
      { name: 'Bulgarian split squats', sets: '2 working', reps: '6-8' },
      { name: 'Barbell RDL', sets: '2 working', reps: '6-8' },
      { name: 'Step ups', sets: '3', reps: '6-8' },
      { name: 'Cable kickbacks', sets: '3', reps: '10-12' },
    ],
  },
  {
    key: 'back-biceps',
    label: 'Back / Biceps',
    exercises: [
      { name: 'Lat pulldown', sets: '3 working', reps: '6-8' },
      { name: 'Seated cable rows', sets: '3', reps: '8-10' },
      { name: 'Cable face pulls', sets: '3', reps: '8-10' },
      { name: 'Bicep curls', sets: '1', reps: '8-10' },
      { name: 'Hammer curls', sets: '1', reps: '6-8' },
      { name: 'Wide arm curls', sets: '1', reps: '6-8' },
    ],
  },
  {
    key: 'chest-triceps',
    label: 'Chest / Triceps',
    exercises: [
      { name: 'Flat bench press', sets: '2 working', reps: '4-6' },
      { name: 'Incline bench press', sets: '2 working', reps: '6-8' },
      { name: 'Lateral raise', sets: '3', reps: '6-8' },
      { name: 'Tricep push down', sets: '3', reps: '8-10' },
      { name: 'Cable chest flies', sets: '3', reps: '8-10' },
      { name: 'Lat pullovers', sets: '3', reps: '8-10' },
    ],
  },
]

// ---------- Weekly checklist ----------
export const WEEKLY_CHECKLIST = [
  'Hit protein goal',
  'Weights 3x a week',
  'Stay hydrated',
  '8 hrs of sleep',
  'Progress photos',
  'Stay in a deficit',
]

// ---------- Josie's note ----------
export const COACH_NOTE = `Temple, I'm so excited to see your progress!! I put you on the same split I personally run, since we're the same height and I've had really good results with this exact programming — it works well for building strength and shape on a smaller frame like ours.

For nutrition, I have you at 2,000-2,200 calories, 130g protein, 275g carbs, and 60g fat. This isn't an aggressive cut — with the volume you're training at between gymnastics and solidcore, an aggressive deficit would tank your energy and recovery. Protein is set high to protect and build muscle, and carbs are pushed up on purpose since you're a carb warrior and your body needs that fuel to perform.

Get creative in the kitchen — look up lighter or higher-protein versions of the things you already love (pasta, burgers, wraps, tacos, bagels, poke bowls) so you're not white-knuckling through this feeling restricted.

Use enough weight that you can't do more than the reps listed. If something says 6-8 and you can do 10, add weight. Try to increase by 5 lbs every couple weeks whenever possible — that's how you'll actually see change.

Please, please prioritize your sleep and hydration!! Your body needs that recovery time to adapt and get stronger, especially with your shoulder history. And remember, the scale doesn't tell the full story — progress photos and how your clothes fit show you the real change.

Can't wait to see you ascend. Reach out with any questions! — Josie`
