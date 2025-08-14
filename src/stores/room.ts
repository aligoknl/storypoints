import { defineStore } from "pinia";
import { ref } from "vue";
import { db, auth } from "../lib/firebase";
import { deleteDoc, doc } from "firebase/firestore";
import {
  ref as dbRef,
  set,
  update,
  get,
  onValue,
  off,
} from "firebase/database";
import DEFAULT_DECK from "../constants/deckValues";

type Player = { name: string; vote: string | null; joinedAt: number };
type RoomMeta = {
  createdAt: number;
  name: string;
  deck: string[];
  revealed: boolean;
  countdownStart: number | null;
  revealCountdownStart: number | null;
  roundId: number;
};

// ---- Helpers ----
const slugify = (text: string) =>
  text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const ensureDeck = (deck?: string[]): string[] =>
  Array.isArray(deck) && deck.length > 0 ? deck : DEFAULT_DECK;

export const useRoomStore = defineStore("room", () => {
  const roomId = ref("");
  const roomMeta = ref<RoomMeta | null>(null);
  const players = ref<Record<string, Player>>({});
  const meUid = ref("");
  const meName = ref("");

  // Listeners cleanup
  let metaCb: (() => void) | null = null;
  let playersCb: (() => void) | null = null;

  // Actions
  const createRoom = async (
    roomName: string,
    creatorName: string,
    deck: string[] = DEFAULT_DECK
  ) => {
    const id = slugify(roomName);
    if (!id) throw new Error("Please enter a valid room name.");

    // Prevent overwrite
    const exists = (await get(dbRef(db, `rooms/${id}/meta`))).exists();
    if (exists) throw new Error("Room name already taken. Choose another.");

    const now = Date.now();
    const meta: RoomMeta = {
      createdAt: now,
      name: roomName,
      deck: ensureDeck(deck),
      revealed: false,
      countdownStart: null,
      revealCountdownStart: null,
      roundId: now,
    };

    await set(dbRef(db, `rooms/${id}/meta`), meta);
    roomId.value = id;

    await joinRoom(id, creatorName);
  };

  const joinRoom = async (id: string, name: string) => {
    if (!auth.currentUser) throw new Error("Not authenticated yet.");
    const uid = auth.currentUser.uid;

    const metaSnap = await get(dbRef(db, `rooms/${id}/meta`));
    if (!metaSnap.exists()) throw new Error("Room not found.");

    roomId.value = id;
    meUid.value = uid;
    meName.value = name;

    // Upsert player
    await update(dbRef(db, `rooms/${id}/players/${uid}`), {
      name,
      vote: players.value[uid]?.vote ?? null,
      joinedAt: Date.now(),
    });

    // Cleanup old listeners
    leaveRoom();

    const metaRef = dbRef(db, `rooms/${id}/meta`);
    const playersRef = dbRef(db, `rooms/${id}/players`);

    const metaListener = onValue(metaRef, (snap) => {
      const data = snap.val() as RoomMeta | null;
      if (data) roomMeta.value = { ...data, deck: ensureDeck(data.deck) };
    });
    metaCb = () => off(metaRef, "value", metaListener);

    const playersListener = onValue(playersRef, (snap) => {
      players.value = (snap.val() as Record<string, Player>) || {};
    });
    playersCb = () => off(playersRef, "value", playersListener);
  };

const leaveRoom = async () => {
  if (metaCb) metaCb();
  if (playersCb) playersCb();
  metaCb = null;
  playersCb = null;

  if (roomId && meUid) {
    try {
      await deleteDoc(doc(db, "rooms", roomId, "players", meUid));
    } catch (err) {
      console.error("Failed to remove player:", err);
    }
  }
};

  const vote = async (value: string | null) => {
    if (!roomId.value || !meUid.value) return;
    await update(dbRef(db, `rooms/${roomId.value}/players/${meUid.value}`), {
      vote: value ?? null,
    });
  };

  const startRoundCountdown = async () => {
    if (!roomId.value) return;
    await update(dbRef(db, `rooms/${roomId.value}/meta`), {
      countdownStart: Date.now(),
      revealCountdownStart: null,
      revealed: false,
    });
  };

  const startRevealCountdown = async () => {
    if (!roomId.value) return;
    await update(dbRef(db, `rooms/${roomId.value}/meta`), {
      revealCountdownStart: Date.now(),
    });
  };

  const reveal = async () => {
    if (!roomId.value) return;
    await update(dbRef(db, `rooms/${roomId.value}/meta`), {
      revealed: true,
      revealCountdownStart: null,
    });
  };

  const startNewVoting = async () => {
    if (!roomId.value) return;
    const rid = roomId.value;
    const newRoundId = Date.now();

    const updates: Record<string, any> = {};
    Object.keys(players.value).forEach((uid) => {
      updates[`rooms/${rid}/players/${uid}/vote`] = null;
    });
    updates[`rooms/${rid}/meta/revealed`] = false;
    updates[`rooms/${rid}/meta/countdownStart`] = null;
    updates[`rooms/${rid}/meta/revealCountdownStart`] = null;
    updates[`rooms/${rid}/meta/roundId`] = newRoundId;

    await update(dbRef(db), updates);
  };

  return {
    roomId,
    roomMeta,
    players,
    meUid,
    meName,
    createRoom,
    joinRoom,
    leaveRoom,
    vote,
    startRoundCountdown,
    startRevealCountdown,
    reveal,
    startNewVoting,
  };
});
