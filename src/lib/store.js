import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateDeviceCode } from './utils';

const initialState = {
  username: '',
  playerId: '',
  quizzes: [],
  scripture: { booksRead: [], chaptersRead: [], versesRead: 0 },
  globalChallenges: [],
  dailyQuizHistory: [],
  playedQuestions: [],
  allQuizQuestions: [],
  settings: {
    sound: { bgMusic: true, soundEffects: true },
    quiz: { timer: 30, questionsPerBook: 10 },
    reader: { fontSize: 'medium' },
  },
};

export const useStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      // ─── User Actions ─────────────────────────────────────────────
      setUsername: (name) => set({ username: name }),
      setPlayerId: (id) => set({ playerId: id }),

      // ─── Quiz Actions ─────────────────────────────────────────────
      addQuizResult: (result) => set((state) => ({
        quizzes: [...state.quizzes, result]
      })),

      addDailyQuizResult: (result) => set((state) => ({
        dailyQuizHistory: [...state.dailyQuizHistory, result]
      })),

      addGlobalChallengeResult: (result) => set((state) => ({
        globalChallenges: [...state.globalChallenges, result]
      })),

      markQuestionsPlayed: (refs) => set((state) => ({
        playedQuestions: [...new Set([...state.playedQuestions, ...refs])]
      })),

      // ─── Scripture Actions ──────────────────────────────────────
      updateScripture: (book, chapter, versesCount) => set((state) => {
        const key = `${book}:${chapter}`;
        const chaptersRead = state.scripture.chaptersRead.includes(key)
          ? state.scripture.chaptersRead
          : [...state.scripture.chaptersRead, key];
        const booksRead = state.scripture.booksRead.includes(book)
          ? state.scripture.booksRead
          : [...state.scripture.booksRead, book];
        return {
          scripture: {
            booksRead,
            chaptersRead,
            versesRead: state.scripture.versesRead + versesCount,
          }
        };
      }),

      // ─── Load Progress ──────────────────────────────────────────
      loadProgress: (progressData) => set((state) => ({
        username: progressData.username || state.username,
        playerId: progressData.playerId || state.playerId,
        quizzes: progressData.quizzes || [],
        scripture: progressData.scripture || { booksRead: [], chaptersRead: [], versesRead: 0 },
        globalChallenges: progressData.globalChallenges || [],
        dailyQuizHistory: progressData.dailyQuizHistory || [],
        playedQuestions: progressData.playedQuestions || [],
      })),

      // ─── Quiz Data Preload ──────────────────────────────────────
      setAllQuizQuestions: (questions) => set({ allQuizQuestions: questions }),

      // ─── Settings Actions ────────────────────────────────────────
      updateSettings: (settings) => set((state) => ({
        settings: { ...state.settings, ...settings }
      })),

      updateSoundSetting: (key, value) => set((state) => ({
        settings: {
          ...state.settings,
          sound: { ...state.settings.sound, [key]: value }
        }
      })),

      updateQuizSetting: (key, value) => set((state) => ({
        settings: {
          ...state.settings,
          quiz: { ...state.settings.quiz, [key]: value }
        }
      })),

      updateReaderSetting: (key, value) => set((state) => ({
        settings: {
          ...state.settings,
          reader: { ...state.settings.reader, [key]: value }
        }
      })),

      // ─── Reset ──────────────────────────────────────────────────
      resetProgress: () => set(initialState),
    }),
    {
      name: 'rhema-storage',
    }
  )
);

// ─── UI State (not persisted) ──────────────────────────────────────
export const useUIStore = create((set) => ({
  activeSection: 'auth',
  currentHomeTab: 'quiz',
  isMuted: false,
  toast: { message: '', type: 'info', visible: false },
  setActiveSection: (section) => set({ activeSection: section }),
  setCurrentHomeTab: (tab) => set({ currentHomeTab: tab }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  // ── Toast actions ──
  setToast: (message, type = 'info') => set({ toast: { message, type, visible: true } }),
  clearToast: () => set({ toast: { message: '', type: 'info', visible: false } }),
}));