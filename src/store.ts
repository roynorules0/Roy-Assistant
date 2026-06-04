import { create } from 'zustand';
import * as db from './db';

export type LiveState = 'offline' | 'connecting' | 'ready' | 'listening' | 'thinking' | 'speaking';

export interface YouTubeVideo {
  id: string;
  title: string;
  url: string;
  description: string;
  channelName: string;
  thumbnail: string;
  duration?: number;
  position?: number;
  addedAt?: number;
  savedAt?: number;
  watchedAt?: number;
}

export interface AppState {
  // Connection and Live Voice Engine State
  apiKey: string;
  liveState: LiveState;
  selectedModel: string;
  voiceVolume: number; // 0 - 100
  micGain: number; // 1 - 5
  selectedVoice: 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';
  isMuted: boolean;
  userTranscript: string;
  aiTranscript: string;
  connectionError: string | null;

  // Personality and Naming (Creator Mode)
  assistantName: string;
  creatorName: string;
  ownerName: string;

  // Secret Boss Mode
  secretPasscode: string;
  isSecretUnlocked: boolean;
  secretNotes: db.SecretNote[];

  // Roy Boss Mode Stats
  batteryLevel: number;
  isBatteryCharging: boolean;
  networkOnline: boolean;
  networkEffectiveType: string;
  networkDownlink: number;

  // Goals & Personal Memory Timeline
  goals: db.Goal[];
  memories: db.Memory[];
  reminders: { id: string; text: string; done: boolean; timestamp: number }[];
  conversations: db.ConversationMessage[];

  // Permissions Dashboard
  microphonePermission: PermissionState | 'unknown';
  notificationsPermission: NotificationPermission | 'unknown';

  // YouTube Media Hub Storage
  youtubeApiKey: string;
  activeVideo: YouTubeVideo | null;
  playerState: 'playing' | 'paused' | 'stopped' | 'ended';
  watchHistory: YouTubeVideo[];
  savedVideos: YouTubeVideo[];
  watchLater: YouTubeVideo[];
  playbackMode: 'best' | 'balanced' | 'smooth';
  musicMode: boolean;
  repeatEnabled: boolean;
  mediaVolume: number;
  mediaMuted: boolean;

  // Camera System
  cameraActive: boolean;
  cameraFacingMode: 'user' | 'environment';
  capturedPhotos: db.PhotoRecord[];
  reviewPhoto: db.PhotoRecord | null;

  setCameraActive: (active: boolean) => void;
  setCameraFacingMode: (mode: 'user' | 'environment') => void;
  setReviewPhoto: (photo: db.PhotoRecord | null) => void;
  addCapturedPhoto: (photo: db.PhotoRecord) => Promise<void>;
  deleteCapturedPhoto: (id: string) => Promise<void>;
  clearCapturedPhotos: () => Promise<void>;

  // State actions
  setApiKey: (key: string) => void;
  setLiveState: (state: LiveState) => void;
  setSelectedModel: (model: string) => void;
  setVoiceVolume: (vol: number) => void;
  setMicGain: (gain: number) => void;
  setSelectedVoice: (voice: 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir') => void;
  setIsMuted: (muted: boolean) => void;
  setUserTranscript: (text: string) => void;
  setAiTranscript: (text: string) => void;
  setConnectionError: (err: string | null) => void;

  // Creator settings action
  setCreatorSettings: (settings: { assistantName: string; creatorName: string; ownerName: string }) => void;

  // Secret passcode settings
  setSecretPasscode: (code: string) => void;
  setSecretUnlock: (unlocked: boolean) => void;

  // YouTube actions
  setYoutubeApiKey: (key: string) => void;
  setActiveVideo: (video: YouTubeVideo | null) => void;
  setPlayerState: (state: 'playing' | 'paused' | 'stopped' | 'ended') => void;
  addToWatchHistory: (video: YouTubeVideo, duration?: number, position?: number) => void;
  toggleSavedVideo: (video: YouTubeVideo) => void;
  toggleWatchLater: (video: YouTubeVideo) => void;
  clearWatchHistory: () => void;
  setPlaybackMode: (mode: 'best' | 'balanced' | 'smooth') => void;
  setMusicMode: (enabled: boolean) => void;
  setRepeatEnabled: (enabled: boolean) => void;
  setMediaVolume: (vol: number) => void;
  setMediaMuted: (muted: boolean) => void;

  // Persistent Actions
  initStore: () => Promise<void>;
  
  // Goals Sync
  addGoal: (goal: Omit<db.Goal, 'id' | 'timestamp' | 'progressLog' | 'completed'>) => Promise<void>;
  updateGoalProgress: (id: string, currentValue: string, comment?: string) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;

  // Memories Sync
  addMemory: (text: string, category: db.Memory['category']) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  clearAllMemories: () => Promise<void>;

  // Secret Notes Sync
  addSecretNote: (title: string, content: string) => Promise<void>;
  deleteSecretNote: (id: string) => Promise<void>;

  // Reminders Actions
  addReminder: (text: string) => void;
  toggleReminder: (id: string) => void;
  deleteReminder: (id: string) => void;

  // Import / Export Memories
  exportMemories: () => string;
  importMemories: (json: string) => Promise<boolean>;

  // Conversation history actions
  addConversationMessage: (role: 'user' | 'model', text: string) => Promise<void>;
  clearConversationHistory: () => Promise<void>;

  // Diagnostics update
  updateDiagnostics: () => void;
  updatePermissions: () => Promise<void>;

  // Dedicated Story Mode State
  storyState: {
    isActive: boolean;
    isPaused: boolean;
    title: string;
    type: string;
    currentChapter: number;
    totalChapters: number;
    durationMinutes: string;
    narrationTranscript: string;
    chaptersHistory: { chapter: number; title: string; content: string }[];
  };
  setStoryState: (state: Partial<AppState['storyState']>) => void;
  resetStoryState: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  apiKey: localStorage.getItem('__roy_apiKey') || '',
  liveState: 'offline',
  selectedModel: 'gemini-3.1-flash-live-preview',
  voiceVolume: Number(localStorage.getItem('__roy_volume')) || 80,
  micGain: Number(localStorage.getItem('__roy_gain')) || 2,
  selectedVoice: (localStorage.getItem('__roy_voice') as any) || 'Zephyr',
  isMuted: false,
  userTranscript: '',
  aiTranscript: '',
  connectionError: null,

  assistantName: localStorage.getItem('__roy_assistantName') || 'Roy Girl AI',
  creatorName: localStorage.getItem('__roy_creatorName') || 'Rishu Boss',
  ownerName: localStorage.getItem('__roy_ownerName') || 'Rishu Boss',

  secretPasscode: localStorage.getItem('__roy_passcode') || '1234',
  isSecretUnlocked: false,
  secretNotes: [],

  batteryLevel: 100,
  isBatteryCharging: false,
  networkOnline: navigator.onLine,
  networkEffectiveType: '4g',
  networkDownlink: 10,

  goals: [],
  memories: [],
  reminders: [],
  conversations: [],

  microphonePermission: 'unknown',
  notificationsPermission: 'unknown',

  // YouTube Media Hub initial storage loaders
  youtubeApiKey: localStorage.getItem('__roy_youtubeApiKey') || '',
  activeVideo: null,
  playerState: 'stopped',
  watchHistory: (() => {
    try {
      const stored = localStorage.getItem('__roy_watchHistory');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  })(),
  savedVideos: (() => {
    try {
      const stored = localStorage.getItem('__roy_savedVideos');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  })(),
  watchLater: (() => {
    try {
      const stored = localStorage.getItem('__roy_watchLater');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  })(),
  playbackMode: (localStorage.getItem('__roy_playbackMode') as 'best' | 'balanced' | 'smooth') || 'smooth',
  musicMode: localStorage.getItem('__roy_musicMode') === 'true',
  repeatEnabled: localStorage.getItem('__roy_repeatEnabled') === 'true',
  mediaVolume: localStorage.getItem('__roy_mediaVolume') !== null ? Number(localStorage.getItem('__roy_mediaVolume')) : 80,
  mediaMuted: localStorage.getItem('__roy_mediaMuted') === 'true',

  // Camera System Initial Values
  cameraActive: false,
  cameraFacingMode: 'user',
  capturedPhotos: [],
  reviewPhoto: null,

  storyState: (() => {
    try {
      const stored = localStorage.getItem('__roy_storyState');
      return stored ? JSON.parse(stored) : {
        isActive: false,
        isPaused: false,
        title: '',
        type: '',
        currentChapter: 1,
        totalChapters: 3,
        durationMinutes: '15m',
        narrationTranscript: '',
        chaptersHistory: []
      };
    } catch {
      return {
        isActive: false,
        isPaused: false,
        title: '',
        type: '',
        currentChapter: 1,
        totalChapters: 3,
        durationMinutes: '15m',
        narrationTranscript: '',
        chaptersHistory: []
      };
    }
  })(),

  setApiKey: (key) => {
    localStorage.setItem('__roy_apiKey', key);
    set({ apiKey: key });
  },
  setLiveState: (liveState) => set({ liveState }),
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  setVoiceVolume: (voiceVolume) => {
    localStorage.setItem('__roy_volume', String(voiceVolume));
    set({ voiceVolume });
  },
  setMicGain: (micGain) => {
    localStorage.setItem('__roy_gain', String(micGain));
    set({ micGain });
  },
  setSelectedVoice: (selectedVoice) => {
    localStorage.setItem('__roy_voice', selectedVoice);
    set({ selectedVoice });
  },
  setIsMuted: (isMuted) => set({ isMuted }),
  setUserTranscript: (userTranscript) => set({ userTranscript }),
  setAiTranscript: (aiTranscript) => set({ aiTranscript }),
  setConnectionError: (connectionError) => set({ connectionError }),

  setStoryState: (state) => {
    const updated = { ...get().storyState, ...state };
    localStorage.setItem('__roy_storyState', JSON.stringify(updated));
    set({ storyState: updated });
  },
  resetStoryState: () => {
    const defaultState = {
      isActive: false,
      isPaused: false,
      title: '',
      type: '',
      currentChapter: 1,
      totalChapters: 3,
      durationMinutes: '15m',
      narrationTranscript: '',
      chaptersHistory: []
    };
    localStorage.setItem('__roy_storyState', JSON.stringify(defaultState));
    set({ storyState: defaultState });
  },

  setCreatorSettings: (settings) => {
    localStorage.setItem('__roy_assistantName', settings.assistantName);
    localStorage.setItem('__roy_creatorName', settings.creatorName);
    localStorage.setItem('__roy_ownerName', settings.ownerName);
    set({
      assistantName: settings.assistantName,
      creatorName: settings.creatorName,
      ownerName: settings.ownerName,
    });
  },

  setSecretPasscode: (code) => {
    localStorage.setItem('__roy_passcode', code);
    set({ secretPasscode: code });
  },
  setSecretUnlock: (isSecretUnlocked) => set({ isSecretUnlocked }),

  // YouTube media actions
  setYoutubeApiKey: (youtubeApiKey) => {
    localStorage.setItem('__roy_youtubeApiKey', youtubeApiKey);
    set({ youtubeApiKey });
  },
  setActiveVideo: (activeVideo) => {
    if (activeVideo) {
      localStorage.setItem('__roy_lastPlayedVideoId', activeVideo.id);
    }
    set({ activeVideo });
  },
  setPlayerState: (playerState) => set({ playerState }),
  addToWatchHistory: (video, duration, position) => {
    const history = [...get().watchHistory];
    const index = history.findIndex(v => v.id === video.id);
    const updatedVideo = {
      ...video,
      watchedAt: Date.now(),
      duration: duration !== undefined ? duration : video.duration,
      position: position !== undefined ? position : video.position,
    };
    if (index > -1) {
      history.splice(index, 1);
    }
    history.unshift(updatedVideo);
    const trimmed = history.slice(0, 50);
    localStorage.setItem('__roy_watchHistory', JSON.stringify(trimmed));
    set({ watchHistory: trimmed });
  },
  toggleSavedVideo: (video) => {
    const saved = [...get().savedVideos];
    const index = saved.findIndex(v => v.id === video.id);
    if (index > -1) {
      saved.splice(index, 1);
    } else {
      saved.push({ ...video, savedAt: Date.now() });
    }
    localStorage.setItem('__roy_savedVideos', JSON.stringify(saved));
    set({ savedVideos: saved });
  },
  toggleWatchLater: (video) => {
    const later = [...get().watchLater];
    const index = later.findIndex(v => v.id === video.id);
    if (index > -1) {
      later.splice(index, 1);
    } else {
      later.push({ ...video, addedAt: Date.now() });
    }
    localStorage.setItem('__roy_watchLater', JSON.stringify(later));
    set({ watchLater: later });
  },
  clearWatchHistory: () => {
    localStorage.removeItem('__roy_watchHistory');
    set({ watchHistory: [] });
  },
  setPlaybackMode: (mode) => {
    localStorage.setItem('__roy_playbackMode', mode);
    set({ playbackMode: mode });
  },
  setMusicMode: (enabled) => {
    localStorage.setItem('__roy_musicMode', String(enabled));
    set({ musicMode: enabled });
  },
  setRepeatEnabled: (enabled) => {
    localStorage.setItem('__roy_repeatEnabled', String(enabled));
    set({ repeatEnabled: enabled });
  },
  setMediaVolume: (vol) => {
    const clamped = Math.max(0, Math.min(100, vol));
    localStorage.setItem('__roy_mediaVolume', String(clamped));
    set({ mediaVolume: clamped });
  },
  setMediaMuted: (muted) => {
    localStorage.setItem('__roy_mediaMuted', String(muted));
    set({ mediaMuted: muted });
  },

  // Load persistent DB records
  initStore: async () => {
    try {
      const goals = await db.getGoals();
      const memories = await db.getMemories();
      const secretNotes = await db.getSecretNotes();
      const conversations = await db.getConversations();
      const photos = await db.getPhotos();
      
      const storedRems = localStorage.getItem('__roy_reminders');
      let reminders = [];
      if (storedRems) {
        reminders = JSON.parse(storedRems);
      } else {
        reminders = [
          { id: '1', text: 'Sync target progress reports with Rishu Boss', done: false, timestamp: Date.now() },
          { id: '2', text: 'Exercise routine - Weight management logging', done: true, timestamp: Date.now() - 3600 * 1000 },
          { id: '3', text: 'Auto-learn memory sweep database validation', done: false, timestamp: Date.now() - 4800 * 1000 }
        ];
        localStorage.setItem('__roy_reminders', JSON.stringify(reminders));
      }

      set({ goals, memories, secretNotes, reminders, conversations, capturedPhotos: photos });

      // Diagnostic and permission listeners
      get().updateDiagnostics();
      await get().updatePermissions();

      if ('getBattery' in navigator) {
        (navigator as any).getBattery().then((battery: any) => {
          set({
            batteryLevel: Math.round(battery.level * 100),
            isBatteryCharging: battery.charging,
          });

          battery.addEventListener('levelchange', () => {
            set({ batteryLevel: Math.round(battery.level * 100) });
          });
          battery.addEventListener('chargingchange', () => {
            set({ isBatteryCharging: battery.charging });
          });
        });
      }

      window.addEventListener('online', () => set({ networkOnline: true }));
      window.addEventListener('offline', () => set({ networkOnline: false }));
    } catch (e) {
      console.error('Store persistent load error', e);
    }
  },

  addGoal: async (goalData) => {
    const newGoal: db.Goal = {
      ...goalData,
      id: 'goal_' + Math.random().toString(36).substr(2, 9),
      completed: false,
      timestamp: Date.now(),
      progressLog: [{ date: new Date().toLocaleDateString(), value: goalData.current, comment: 'Goal Initialized' }]
    };
    await db.saveGoal(newGoal);
    set({ goals: [...get().goals, newGoal] });
    
    // Log timeline event
    await get().addMemory(`Created a target goal: ${newGoal.title} (${newGoal.category})`, 'user');
  },

  updateGoalProgress: async (id, currentValue, comment) => {
    const goals = get().goals;
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;

    const isCompleted = currentValue === goal.target || parseFloat(currentValue) >= parseFloat(goal.target);
    const updatedGoal: db.Goal = {
      ...goal,
      current: currentValue,
      completed: isCompleted,
      progressLog: [
        ...goal.progressLog,
        {
          date: new Date().toLocaleDateString(),
          value: currentValue,
          comment: comment || 'Progress log update',
        },
      ],
    };

    await db.saveGoal(updatedGoal);
    set({ goals: goals.map((g) => (g.id === id ? updatedGoal : g)) });

    // Log progress timeline
    await get().addMemory(
      `Updated goal "${goal.title}" progress to ${currentValue}. ${isCompleted ? 'Target achieved! 🎉' : ''}`,
      'auto'
    );
  },

  deleteGoal: async (id) => {
    await db.deleteGoal(id);
    set({ goals: get().goals.filter((g) => g.id !== id) });
  },

  addMemory: async (text, category) => {
    const newMemory: db.Memory = {
      id: 'mem_' + Math.random().toString(36).substr(2, 9),
      text,
      category,
      timestamp: Date.now(),
    };
    await db.saveMemory(newMemory);
    set({ memories: [newMemory, ...get().memories] });
  },

  deleteMemory: async (id) => {
    await db.deleteMemory(id);
    set({ memories: get().memories.filter((m) => m.id !== id) });
  },

  clearAllMemories: async () => {
    await db.clearAllMemories();
    set({ memories: [] });
  },

  addSecretNote: async (title, content) => {
    const newNote: db.SecretNote = {
      id: 'sec_' + Math.random().toString(36).substr(2, 9),
      title,
      content,
      timestamp: Date.now(),
    };
    await db.saveSecretNote(newNote);
    set({ secretNotes: [...get().secretNotes, newNote] });
    await get().addMemory(`Added locked note "${title}" in Secret Boss Mode.`, 'user');
  },

  deleteSecretNote: async (id) => {
    await db.deleteSecretNote(id);
    set({ secretNotes: get().secretNotes.filter((n) => n.id !== id) });
  },

  updateDiagnostics: () => {
    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (connection) {
      set({
        networkEffectiveType: connection.effectiveType || '4g',
        networkDownlink: connection.downlink || 10,
      });
    }
  },

  updatePermissions: async () => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const micPerm = await navigator.permissions.query({ name: 'microphone' as any });
        set({ microphonePermission: micPerm.state });
        micPerm.onchange = () => {
          set({ microphonePermission: micPerm.state });
        };

        const notifyPerm = Notification.permission;
        set({ notificationsPermission: notifyPerm });
      }
    } catch (e) {
      console.warn('Permissions query API not fully supported in this context', e);
    }
  },

  // Reminders Actions implementation
  addReminder: (text: string) => {
    const nextRems = [
      ...get().reminders,
      { id: 'rem_' + Math.random().toString(36).substr(2, 9), text, done: false, timestamp: Date.now() }
    ];
    set({ reminders: nextRems });
    localStorage.setItem('__roy_reminders', JSON.stringify(nextRems));
    get().addMemory(`Delegated a passive reminder: "${text}"`, 'user');
  },

  toggleReminder: (id: string) => {
    const nextRems = get().reminders.map((r) =>
      r.id === id ? { ...r, done: !r.done } : r
    );
    set({ reminders: nextRems });
    localStorage.setItem('__roy_reminders', JSON.stringify(nextRems));
    
    const rem = nextRems.find((r) => r.id === id);
    if (rem && rem.done) {
      get().addMemory(`Completed Boss Mode reminder: "${rem.text}"`, 'auto');
    }
  },

  deleteReminder: (id: string) => {
    const nextRems = get().reminders.filter((r) => r.id !== id);
    set({ reminders: nextRems });
    localStorage.setItem('__roy_reminders', JSON.stringify(nextRems));
  },

  // Export Long Term Memories
  exportMemories: () => {
    const payload = {
      memories: get().memories,
      exportVersion: 1,
      timestamp: Date.now(),
      ownerName: get().ownerName
    };
    return JSON.stringify(payload, null, 2);
  },

  // Import Long Term Memories (Survives Refresh, loaded into IDB)
  importMemories: async (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && Array.isArray(parsed.memories)) {
        // Clear all previous and load
        await db.clearAllMemories();
        for (const item of parsed.memories) {
          if (item && item.text) {
            const memoryRecord: db.Memory = {
              id: item.id || 'mem_' + Math.random().toString(36).substr(2, 9),
              text: item.text,
              category: item.category || 'user',
              timestamp: item.timestamp || Date.now()
            };
            await db.saveMemory(memoryRecord);
          }
        }
        const updatedMemories = await db.getMemories();
        set({ memories: updatedMemories });
        await get().addMemory(`Successfully imported ${parsed.memories.length} historical long-term memories via file deck.`, 'auto');
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to parse and import memory backups:', e);
      return false;
    }
  },

  setCameraActive: (active) => {
    set({ cameraActive: active });
  },

  setCameraFacingMode: (mode) => {
    set({ cameraFacingMode: mode });
  },

  setReviewPhoto: (photo) => {
    set({ reviewPhoto: photo });
  },

  addCapturedPhoto: async (photo) => {
    await db.savePhoto(photo);
    const updatedPhotos = await db.getPhotos();
    set({ capturedPhotos: updatedPhotos });
    get().addMemory(`Captured a new camera photo record (${photo.id}) on ${photo.date} at ${photo.time}`, 'auto');
  },

  deleteCapturedPhoto: async (id) => {
    await db.deletePhoto(id);
    const updatedPhotos = await db.getPhotos();
    set({ capturedPhotos: updatedPhotos });
    if (get().reviewPhoto?.id === id) {
      set({ reviewPhoto: null });
    }
  },

  clearCapturedPhotos: async () => {
    const list = get().capturedPhotos;
    for (const ph of list) {
      await db.deletePhoto(ph.id);
    }
    set({ capturedPhotos: [], reviewPhoto: null });
  },

  addConversationMessage: async (role, text) => {
    const newMessage: db.ConversationMessage = {
      id: 'msg_' + Math.random().toString(36).substr(2, 9),
      role,
      text,
      timestamp: Date.now(),
    };
    await db.saveConversation(newMessage);
    set({ conversations: [...get().conversations, newMessage] });
  },

  clearConversationHistory: async () => {
    await db.clearConversations();
    set({ conversations: [] });
  },
}));
