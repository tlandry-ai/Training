// A small rotating set of verses. Picked deterministically by day-of-year
// so the same day always shows the same verse.

export interface Verse {
  text: string
  ref: string
}

export const VERSES: Verse[] = [
  {
    text: 'But they who wait for the Lord shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary.',
    ref: 'Isaiah 40:31',
  },
  {
    text: 'I can do all things through him who strengthens me.',
    ref: 'Philippians 4:13',
  },
  {
    text: 'She is clothed with strength and dignity, and she laughs without fear of the future.',
    ref: 'Proverbs 31:25',
  },
  {
    text: 'Do you not know that in a race all the runners run, but only one receives the prize? So run that you may obtain it.',
    ref: '1 Corinthians 9:24',
  },
  {
    text: 'Whatever you do, work heartily, as for the Lord and not for men.',
    ref: 'Colossians 3:23',
  },
  {
    text: 'Have I not commanded you? Be strong and courageous. Do not be frightened, for the Lord your God is with you wherever you go.',
    ref: 'Joshua 1:9',
  },
  {
    text: 'Let us run with endurance the race that is set before us, looking to Jesus, the founder and perfecter of our faith.',
    ref: 'Hebrews 12:1-2',
  },
  {
    text: 'The Lord is my strength and my shield; in him my heart trusts, and I am helped.',
    ref: 'Psalm 28:7',
  },
  {
    text: 'And let us not grow weary of doing good, for in due season we will reap, if we do not give up.',
    ref: 'Galatians 6:9',
  },
  {
    text: 'For God gave us a spirit not of fear but of power and love and self-control.',
    ref: '2 Timothy 1:7',
  },
  {
    text: 'Commit your work to the Lord, and your plans will be established.',
    ref: 'Proverbs 16:3',
  },
  {
    text: 'The heart of man plans his way, but the Lord establishes his steps.',
    ref: 'Proverbs 16:9',
  },
  {
    text: 'Trust in the Lord with all your heart, and do not lean on your own understanding.',
    ref: 'Proverbs 3:5',
  },
  {
    text: 'Be strong, and let your heart take courage, all you who wait for the Lord.',
    ref: 'Psalm 31:24',
  },
]

export function verseForDate(d: Date): Verse {
  const start = new Date(d.getFullYear(), 0, 0)
  const diff = d.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / 86400000)
  return VERSES[dayOfYear % VERSES.length]
}
