import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, get } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Detect if we have real Firebase config or fall back to BroadcastChannel mock
const hasFirebaseConfig = !!firebaseConfig.apiKey && !!firebaseConfig.databaseURL;
let db = null;

if (hasFirebaseConfig) {
  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
}

// ---- MOCK using BroadcastChannel + localStorage (works across tabs in same browser) ----
const CHANNEL_NAME = 'battleline_sync';
let broadcastChannel = null;
try {
  broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
} catch(e) {
  // Safari fallback: BroadcastChannel might not be available
  broadcastChannel = null;
}

const syncMock = (roomId, gameState) => {
  const key = `battleline_room_${roomId}`;
  const serialized = JSON.stringify(gameState);
  localStorage.setItem(key, serialized);
  // Broadcast to other tabs via BroadcastChannel
  if (broadcastChannel) {
    broadcastChannel.postMessage({ roomId, gameState });
  }
};

const listenMock = (roomId, callback) => {
  const key = `battleline_room_${roomId}`;
  // Load initial value
  const initial = localStorage.getItem(key);
  if (initial) {
    try { callback(JSON.parse(initial)); } catch(e) {}
  }
  // Listen for changes from other tabs
  const handler = (event) => {
    if (event.data?.roomId === roomId) {
      callback(event.data.gameState);
    }
  };
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handler);
    return () => broadcastChannel.removeEventListener('message', handler);
  }
  // Fallback: poll localStorage every 500ms
  const interval = setInterval(() => {
    const val = localStorage.getItem(key);
    if (val) { try { callback(JSON.parse(val)); } catch(e) {} }
  }, 500);
  return () => clearInterval(interval);
};

const createMock = (roomId, initialState) => {
  const key = `battleline_room_${roomId}`;
  localStorage.setItem(key, JSON.stringify(initialState));
  return true;
};

// ---- PUBLIC API ----

export const syncGameState = (roomId, gameState) => {
  if (db) {
    set(ref(db, `rooms/${roomId}/gameState`), gameState);
  } else {
    syncMock(roomId, gameState);
  }
};

export const listenToGameState = (roomId, callback) => {
  if (db) {
    const roomRef = ref(db, `rooms/${roomId}/gameState`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) callback(data);
    });
    return unsubscribe;
  } else {
    return listenMock(roomId, callback);
  }
};

export const createRoom = async (roomId, initialState) => {
  if (db) {
    try {
      await set(ref(db, `rooms/${roomId}`), {
        createdAt: Date.now(),
        gameState: initialState
      });
      return true;
    } catch(e) {
      console.error("Error creating Firebase room:", e);
      return false;
    }
  } else {
    return createMock(roomId, initialState);
  }
};
