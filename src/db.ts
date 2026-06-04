export interface Goal {
  id: string;
  title: string;
  category: 'weight' | 'study' | 'business' | 'personal';
  target: string;
  current: string;
  deadline: string;
  completed: boolean;
  progressLog: { date: string; value: string; comment?: string }[];
  timestamp: number;
}

export interface Memory {
  id: string;
  text: string;
  category: 'auto' | 'user' | 'preference' | 'conversation';
  timestamp: number;
}

export interface SecretNote {
  id: string;
  title: string;
  content: string; // Stored securely, unlocked open verification
  timestamp: number;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface PhotoRecord {
  id: string;
  dataUrl: string;
  date: string;
  time: string;
  location?: string;
  isBest?: boolean;
  score?: {
    sharpness: number;
    lighting: number;
    faceVisibility: number;
    blur: number;
  };
  reviewMsg?: string;
  personLabel?: string; // Optional label, e.g. "Astha"
  source?: 'camera' | 'vault'; // Source of the photo
  timestamp: number;
}

const DB_NAME = 'RoyGirlAI_DB';
const DB_VERSION = 3;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('goals')) {
        db.createObjectStore('goals', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('memories')) {
        db.createObjectStore('memories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('secret_notes')) {
        db.createObjectStore('secret_notes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('conversations')) {
        db.createObjectStore('conversations', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'id' });
      }
    };
  });
}

export async function getGoals(): Promise<Goal[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('goals', 'readonly');
    const store = transaction.objectStore('goals');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function saveGoal(goal: Goal): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('goals', 'readwrite');
    const store = transaction.objectStore('goals');
    const request = store.put(goal);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteGoal(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('goals', 'readwrite');
    const store = transaction.objectStore('goals');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getMemories(): Promise<Memory[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('memories', 'readonly');
    const store = transaction.objectStore('memories');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function saveMemory(memory: Memory): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('memories', 'readwrite');
    const store = transaction.objectStore('memories');
    const request = store.put(memory);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteMemory(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('memories', 'readwrite');
    const store = transaction.objectStore('memories');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllMemories(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('memories', 'readwrite');
    const store = transaction.objectStore('memories');
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getSecretNotes(): Promise<SecretNote[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('secret_notes', 'readonly');
    const store = transaction.objectStore('secret_notes');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSecretNote(note: SecretNote): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('secret_notes', 'readwrite');
    const store = transaction.objectStore('secret_notes');
    const request = store.put(note);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteSecretNote(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('secret_notes', 'readwrite');
    const store = transaction.objectStore('secret_notes');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getConversations(): Promise<ConversationMessage[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('conversations', 'readonly');
    const store = transaction.objectStore('conversations');
    const request = store.getAll();
    request.onsuccess = () => {
      const msgs = request.result || [];
      // Sort in chronological order
      msgs.sort((a, b) => a.timestamp - b.timestamp);
      resolve(msgs);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveConversation(msg: ConversationMessage): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('conversations', 'readwrite');
    const store = transaction.objectStore('conversations');
    const request = store.put(msg);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearConversations(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('conversations', 'readwrite');
    const store = transaction.objectStore('conversations');
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPhotos(): Promise<PhotoRecord[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('photos', 'readonly');
    const store = transaction.objectStore('photos');
    const request = store.getAll();
    request.onsuccess = () => {
      const list = request.result || [];
      list.sort((a, b) => b.timestamp - a.timestamp); // newest first
      resolve(list);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function savePhoto(photo: PhotoRecord): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('photos', 'readwrite');
    const store = transaction.objectStore('photos');
    const request = store.put(photo);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('photos', 'readwrite');
    const store = transaction.objectStore('photos');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
