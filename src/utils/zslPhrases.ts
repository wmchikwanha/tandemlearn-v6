/**
 * Common-phrase mini library for Zimbabwean / Southern African Sign Language.
 *
 * Each entry points to an optional short clip in /public/signs/phrases/.
 * If the clip is missing, the UI falls back to a captioned placeholder so the
 * grid never looks empty while the real ZSL footage is being recorded.
 */

export interface ZSLPhrase {
  id: string;
  english: string;
  shona?: string;
  ndebele?: string;
  /** filename inside /signs/phrases/  e.g. "hello.mp4" */
  clip?: string;
  /** rough category for grouping */
  category: "greeting" | "classroom" | "needs" | "feelings" | "everyday";
}

export const ZSL_PHRASES: ZSLPhrase[] = [
  { id: "hello",      english: "Hello",        shona: "Mhoro",        ndebele: "Sawubona",   clip: "hello.mp4",      category: "greeting" },
  { id: "goodbye",    english: "Goodbye",      shona: "Chisarai",     ndebele: "Sala kahle", clip: "goodbye.mp4",    category: "greeting" },
  { id: "thank-you",  english: "Thank you",    shona: "Ndatenda",     ndebele: "Ngiyabonga", clip: "thank-you.mp4",  category: "greeting" },
  { id: "please",     english: "Please",       shona: "Ndapota",      ndebele: "Ngicela",    clip: "please.mp4",     category: "greeting" },
  { id: "my-name",    english: "My name is",   shona: "Zita rangu",   ndebele: "Igama lami", clip: "my-name.mp4",    category: "greeting" },

  { id: "yes",        english: "Yes",          shona: "Hongu",        ndebele: "Yebo",       clip: "yes.mp4",        category: "everyday" },
  { id: "no",         english: "No",           shona: "Kwete",        ndebele: "Hatshi",     clip: "no.mp4",         category: "everyday" },
  { id: "help",       english: "Help",         shona: "Batsira",      ndebele: "Ngisize",    clip: "help.mp4",       category: "needs" },
  { id: "water",      english: "Water",        shona: "Mvura",        ndebele: "Amanzi",     clip: "water.mp4",      category: "needs" },
  { id: "toilet",     english: "Toilet",       shona: "Chimbuzi",     ndebele: "Indlu encane",clip: "toilet.mp4",    category: "needs" },
  { id: "food",       english: "Food",         shona: "Chikafu",      ndebele: "Ukudla",     clip: "food.mp4",       category: "needs" },
  { id: "home",       english: "Home",         shona: "Kumba",        ndebele: "Ekhaya",     clip: "home.mp4",       category: "everyday" },

  { id: "teacher",    english: "Teacher",      shona: "Mudzidzisi",   ndebele: "Uthisha",    clip: "teacher.mp4",    category: "classroom" },
  { id: "student",    english: "Student",      shona: "Mudzidzi",     ndebele: "Umfundi",    clip: "student.mp4",    category: "classroom" },
  { id: "learn",      english: "Learn",        shona: "Dzidza",       ndebele: "Funda",      clip: "learn.mp4",      category: "classroom" },
  { id: "book",       english: "Book",         shona: "Bhuku",        ndebele: "Incwadi",    clip: "book.mp4",       category: "classroom" },
  { id: "question",   english: "Question",     shona: "Mubvunzo",     ndebele: "Umbuzo",     clip: "question.mp4",   category: "classroom" },
  { id: "understand", english: "Understand",   shona: "Nzwisisa",     ndebele: "Ngiyaqonda", clip: "understand.mp4", category: "classroom" },

  { id: "happy",      english: "Happy",        shona: "Anofara",      ndebele: "Jabulile",   clip: "happy.mp4",      category: "feelings" },
  { id: "sorry",      english: "Sorry",        shona: "Ndineurombo",  ndebele: "Uxolo",      clip: "sorry.mp4",      category: "feelings" },
];

export const ZSL_PHRASE_CATEGORIES: Record<ZSLPhrase["category"], string> = {
  greeting: "Greetings",
  classroom: "Classroom",
  needs: "Needs",
  feelings: "Feelings",
  everyday: "Everyday",
};

export function findPhraseByEnglish(word: string): ZSLPhrase | undefined {
  const w = word.trim().toLowerCase();
  return ZSL_PHRASES.find(
    (p) => p.english.toLowerCase() === w || p.id === w,
  );
}
