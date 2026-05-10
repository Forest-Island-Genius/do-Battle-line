import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Detect real Firebase config; fall back to BroadcastChannel + localStorage mock.
const hasFirebaseConfig = !!firebaseConfig.apiKey && !!firebaseConfig.databaseURL;
let db = null;
if (hasFirebaseConfig) {
  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
}

// ---- Array & null normalization ----
// Firebase strips empty arrays AND null values on write. On read-back:
// - empty arrays become undefined (or null)
// - arrays with content come back as objects with numeric keys
// - null fields disappear entirely
//
// We must (a) restore arrays, and (b) restore null defaults so the next write
// doesn't contain undefined (Firebase set() throws synchronously for undefined).

const toArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return Object.keys(val).sort((a, b) => Number(a) - Number(b)).map(k => val[k]);
};

const normalizeGameState = (state) => {
  if (!state) return state;
  return {
    status: state.status || 'PLAYING',
    turn: state.turn || 'P1',
    troopDeck: toArray(state.troopDeck),
    tacticalDeck: toArray(state.tacticalDeck),
    p1: {
      hand: toArray(state.p1?.hand),
      tacticalPlayed: state.p1?.tacticalPlayed ?? 0,
      leaderPlayed: !!state.p1?.leaderPlayed,
    },
    p2: {
      hand: toArray(state.p2?.hand),
      tacticalPlayed: state.p2?.tacticalPlayed ?? 0,
      leaderPlayed: !!state.p2?.leaderPlayed,
    },
    flags: toArray(state.flags).map((f, i) => ({
      id: f?.id ?? `flag_${i}`,
      index: f?.index ?? i,
      claimedBy: f?.claimedBy ?? null,
      p1Cards: toArray(f?.p1Cards),
      p2Cards: toArray(f?.p2Cards),
      weatherCard: f?.weatherCard ?? null,
      firstCompletedBy: f?.firstCompletedBy ?? null,
    })),
    pendingAction: state.pendingAction ?? null,
  };
};

// 書き込み前に undefined を再帰的に除去 (Firebase set() は undefined で throw する)。
// null は許容する (null そのものは Firebase が削除するが throw しない)。
const stripUndefined = (val) => {
  if (val === undefined) return null;
  if (val === null) return null;
  if (Array.isArray(val)) return val.map(stripUndefined);
  if (typeof val === 'object') {
    const out = {};
    for (const k of Object.keys(val)) {
      const cleaned = stripUndefined(val[k]);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  }
  return val;
};

// ---- BroadcastChannel + localStorage mock (cross-tab same browser) ----
const CHANNEL_NAME = 'battleline_sync';
let broadcastChannel = null;
try {
  broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
} catch (_e) {
  broadcastChannel = null;
}

const syncMock = (roomId, gameState) => {
  const key = `battleline_room_${roomId}`;
  localStorage.setItem(key, JSON.stringify(gameState));
  if (broadcastChannel) broadcastChannel.postMessage({ roomId, gameState });
};

const listenMock = (roomId, callback) => {
  const key = `battleline_room_${roomId}`;
  const initial = localStorage.getItem(key);
  if (initial) {
    try { callback(JSON.parse(initial)); } catch (_e) { /* ignore parse error */ }
  }
  const handler = (event) => {
    if (event.data?.roomId === roomId) callback(event.data.gameState);
  };
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handler);
    return () => broadcastChannel.removeEventListener('message', handler);
  }
  const interval = setInterval(() => {
    const val = localStorage.getItem(key);
    if (val) { try { callback(JSON.parse(val)); } catch (_e) { /* ignore */ } }
  }, 500);
  return () => clearInterval(interval);
};

const createMock = (roomId, initialState) => {
  localStorage.setItem(`battleline_room_${roomId}`, JSON.stringify(initialState));
  return true;
};

// ---- Public API ----

export const syncGameState = (roomId, gameState) => {
  if (db) {
    const safe = stripUndefined(gameState);
    // Promise エラーをハンドルしてアプリケーション側が空振りしないようにする
    set(ref(db, `rooms/${roomId}/gameState`), safe).catch(err => {
      console.error('[syncGameState] Firebase write failed:', err);
    });
  } else {
    syncMock(roomId, gameState);
  }
};

export const listenToGameState = (roomId, callback) => {
  if (db) {
    const roomRef = ref(db, `rooms/${roomId}/gameState`);
    return onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) callback(normalizeGameState(data));
    });
  }
  return listenMock(roomId, (state) => callback(normalizeGameState(state)));
};

export const createRoom = async (roomId, initialState) => {
  if (db) {
    try {
      const safe = stripUndefined(initialState);
      await set(ref(db, `rooms/${roomId}`), {
        createdAt: Date.now(),
        gameState: safe,
      });
      return true;
    } catch (e) {
      console.error('Error creating Firebase room:', e);
      return false;
    }
  }
  return createMock(roomId, initialState);
};
