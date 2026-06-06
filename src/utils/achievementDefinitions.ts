export interface AchievementDefinition {
  type: string;
  title: string;
  description: string;
  emoji: string;
  threshold: number;
  category: 'attendance' | 'participation' | 'learning' | 'vocabulary' | 'milestone';
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Attendance streaks
  {
    type: 'streak_3',
    title: 'Getting Started',
    description: 'Attended 3 days in a row',
    emoji: '🔥',
    threshold: 3,
    category: 'attendance',
  },
  {
    type: 'streak_7',
    title: 'Week Warrior',
    description: 'Attended 7 days in a row',
    emoji: '🔥',
    threshold: 7,
    category: 'attendance',
  },
  {
    type: 'streak_30',
    title: 'Unstoppable',
    description: 'Attended 30 days in a row',
    emoji: '🔥',
    threshold: 30,
    category: 'attendance',
  },
  // Participation
  {
    type: 'hand_raised_10',
    title: 'Active Learner',
    description: 'Raised hand 10 times',
    emoji: '🗣️',
    threshold: 10,
    category: 'participation',
  },
  {
    type: 'contributed_5',
    title: 'Voice Heard',
    description: 'Contributed in 5 sessions',
    emoji: '🎤',
    threshold: 5,
    category: 'participation',
  },
  // Learning
  {
    type: 'summaries_5',
    title: 'Bookworm',
    description: 'Reviewed 5 lesson summaries',
    emoji: '📚',
    threshold: 5,
    category: 'learning',
  },
  {
    type: 'top_marks',
    title: 'Top Marks',
    description: 'Scored 90%+ on a lesson',
    emoji: '⭐',
    threshold: 90,
    category: 'learning',
  },
  {
    type: 'first_lesson',
    title: 'First Steps',
    description: 'Completed your first lesson',
    emoji: '🎓',
    threshold: 1,
    category: 'milestone',
  },
  // Vocabulary
  {
    type: 'vocab_10',
    title: 'Word Explorer',
    description: 'Added 10 words to your bank',
    emoji: '📝',
    threshold: 10,
    category: 'vocabulary',
  },
  {
    type: 'vocab_20',
    title: 'Word Collector',
    description: 'Added 20 words to your bank',
    emoji: '📝',
    threshold: 20,
    category: 'vocabulary',
  },
  {
    type: 'mastered_10',
    title: 'Word Master',
    description: 'Mastered 10 vocabulary words',
    emoji: '🏆',
    threshold: 10,
    category: 'vocabulary',
  },
];

export const getAchievementDef = (type: string) =>
  ACHIEVEMENT_DEFINITIONS.find((a) => a.type === type);
