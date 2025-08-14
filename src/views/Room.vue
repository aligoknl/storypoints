<script setup lang="ts">
import { computed, onMounted, ref, onBeforeUnmount, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import Tag from "primevue/tag";
import Card from "primevue/card";
import Dialog from "primevue/dialog";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import { useRoomStore } from "../stores/room";
import PlanningCard from "../components/PlanningCard.vue";
import PlayerSeat from "../components/PlayerSeat.vue";
import Confetti from "../components/Confetti.vue";
import DEFAULT_DECK from "../constants/deckValues";

type Player = { name: string; vote: string | null; joinedAt: number };
type PlayersMap = Record<string, Player>;
type RoomMeta = {
  createdAt: number;
  name: string;
  deck: string[];
  revealed: boolean;
  countdownStart: number | null;
  revealCountdownStart: number | null;
  roundId: number;
};

const route = useRoute();
const router = useRouter();
const toast = useToast();
const roomStore = useRoomStore();

onMounted(async () => {
  const id = String(route.params.id);
  const name = String(route.query.name || "Player");
  try {
    await roomStore.joinRoom(id, name);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to join room.";
    toast.add({
      severity: "error",
      summary: "Join Room Failed",
      detail: msg,
      life: 3000,
    });
    router.push("/");
  }
});

const deck = computed<string[]>(() => {
  const meta = roomStore.roomMeta as RoomMeta | null;
  return Array.isArray(meta?.deck) ? meta!.deck : DEFAULT_DECK;
});

const revealed = computed<boolean>(
  () => (roomStore.roomMeta as RoomMeta | null)?.revealed ?? false
);
const myVote = computed<string | null>(() => {
  const me = roomStore.meUid;
  const p = (roomStore.players as PlayersMap)[me];
  return p?.vote ?? null;
});
const norm = (v: unknown): string | null => (v == null ? null : String(v));

const ROUND_DURATION = 60;
const timeLeft = ref<number>(ROUND_DURATION);
let timer: number | null = null;

const hasVotes = computed<boolean>(() =>
  Object.values(roomStore.players as PlayersMap).some((p) => !!norm(p.vote))
);

const stopTimer = (): void => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};
onBeforeUnmount(stopTimer);

watch(
  () => (roomStore.roomMeta as RoomMeta | null)?.countdownStart,
  (start) => {
    stopTimer();
    if (!start) {
      timeLeft.value = ROUND_DURATION;
      return;
    }
    const tick = (): void => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const left = ROUND_DURATION - elapsed;
      timeLeft.value = left > 0 ? left : 0;
      if (left <= 0) {
        stopTimer();
        const meta = roomStore.roomMeta as RoomMeta | null;
        if (!revealed.value && hasVotes.value && !meta?.revealCountdownStart) {
          roomStore.startRevealCountdown();
        }
      }
    };
    tick();
    timer = window.setInterval(tick, 1000);
  },
  { immediate: true }
);

const showCountdown = ref<boolean>(false);
const countdownNum = ref<number>(3);

watch(
  () => (roomStore.roomMeta as RoomMeta | null)?.revealCountdownStart,
  (start) => {
    if (!start) {
      showCountdown.value = false;
      return;
    }
    showCountdown.value = true;
    const tick = (): void => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      countdownNum.value = 3 - elapsed;
      if (countdownNum.value <= 0) {
        showCountdown.value = false;
        roomStore.reveal();
        stopTimer();
      }
    };
    tick();
    const iv = window.setInterval(tick, 1000);
    window.setTimeout(() => window.clearInterval(iv), 4000);
  },
  { immediate: true }
);

const showResultModal = ref<boolean>(false);
const confettiOn = ref<boolean>(false);
let resultTimeout: number | null = null;

const isNumericVote = (v: unknown): v is number => {
  if (v == null) return false;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n);
};

const numericVotes = computed<number[]>(() =>
  Object.values(roomStore.players as PlayersMap)
    .map((p) => p.vote)
    .filter(isNumericVote)
    .map((v) => Number(String(v).replace(",", ".")))
);

const average = computed<number | null>(() => {
  const arr = numericVotes.value;
  if (!arr.length) return null;
  const sum = arr.reduce((a, b) => a + b, 0);
  return Math.round((sum / arr.length) * 100) / 100;
});

watch(revealed, (isRev, wasRev) => {
  if (isRev && !wasRev) {
    showResultModal.value = true;
    confettiOn.value = true;
    if (resultTimeout) window.clearTimeout(resultTimeout);
    resultTimeout = window.setTimeout(() => {
      showResultModal.value = false;
      confettiOn.value = false;
    }, 3000);
  }
});

const closeResultModal = (): void => {
  showResultModal.value = false;
  confettiOn.value = false;
  if (resultTimeout) {
    window.clearTimeout(resultTimeout);
    resultTimeout = null;
  }
};

const cast = (v: string): void => {
  myVote.value === v ? roomStore.vote(null) : roomStore.vote(v);
};
const triggerReveal = (): void => roomStore.startRevealCountdown();
const startRound = (): void => roomStore.startRoundCountdown();
const startNewVoting = async (): Promise<void> => {
  await roomStore.startNewVoting();
};
const copyLink = (): void => {
  const url = `${location.origin}/room/${
    roomStore.roomId
  }?name=${encodeURIComponent(roomStore.meName || "Player")}`;
  navigator.clipboard.writeText(url);
  toast.add({
    severity: "info",
    summary: "Link copied",
    detail: url,
    life: 2000,
  });
};

const playersArr = computed<Array<Player & { uid: string }>>(() =>
  Object.entries(roomStore.players as PlayersMap)
    .map(([uid, p]) => ({ uid, ...p }))
    .sort((a, b) => a.name.localeCompare(b.name))
);

const visiblePlayers = computed<Array<Player & { uid: string }>>(() =>
  playersArr.value.filter((p) => p.vote !== null && p.vote !== undefined)
);

const TABLE_RADIUS = 120;
const seatTransform = computed<(i: number) => string>(() => {
  const n = Math.max(visiblePlayers.value.length, 1);
  return (i: number) => {
    const a = (i / n) * 360; // start at top already
    return `translate(-50%, -50%) rotate(${a}deg) translate(0, -${TABLE_RADIUS}px) rotate(${-a}deg)`;
  };
});

const allSameNumber = computed(() => {
  const validVotes = Object.values(roomStore.players)
    .map((p) => p.vote)
    .filter((v) => v !== null && v !== undefined && v !== "?" && v !== "☕")
    .map((v) => Number(v));

  if (validVotes.length === 0) return false;
  return validVotes.every((v) => v === validVotes[0]);
});
</script>

<template>
  <main class="p-6 max-w-5xl mx-auto space-y-6 text-brand-gray">
    <Toast />
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-2xl font-bold text-brand-teal">
          StoryPoints — {{ roomStore.roomId }}
        </h2>
        <p class="text-xl text-gray-600">
          Hello, <b>{{ roomStore.meName }}</b>
        </p>
      </div>
      <div class="flex gap-2">
        <router-link to="/"
          ><Button label="Back to Home" icon="pi pi-home"
        /></router-link>
        <Button icon="pi pi-link" label="Copy link" @click="copyLink" />
      </div>
    </header>

    <!-- Info cards -->
    <section class="grid gap-4 md:grid-cols-3">
      <Card>
        <template #title>Round Timer</template>
        <template #content>
          <div class="flex items-center gap-3">
            <div
              class="w-20 h-20 rounded-full bg-brand-tealLight text-brand-teal flex items-center justify-center text-2xl font-bold"
            >
              {{ timeLeft }}
            </div>
            <div class="flex flex-col gap-2">
              <Button size="small" label="Start" @click="startRound" />
              <Button
                size="small"
                label="Stop"
                severity="secondary"
                @click="() => {}"
              />
            </div>
          </div>
        </template>
      </Card>

      <Card>
        <template #title>Average</template>
        <template #content>
          <template v-if="revealed">
            <p
              v-if="average !== null"
              class="text-3xl font-bold text-brand-teal"
              aria-live="polite"
            >
              {{ average }}
            </p>
            <p v-else class="opacity-70">
              No numeric votes yet (coffee & “?” ignored).
            </p>
          </template>
          <p v-else class="opacity-70">Revealed average appears here.</p>
        </template>
      </Card>

      <Card>
        <template #title>Players</template>
        <template #content>
          <div class="flex flex-wrap gap-2">
            <Tag
              v-for="p in playersArr"
              :key="p.uid"
              :value="
                revealed
                  ? `${p.name} — ${norm(p.vote) ?? '—'}`
                  : norm(p.vote)
                  ? p.uid === roomStore.meUid
                    ? `${p.name} — ${norm(p.vote)}`
                    : `${p.name} — Voted`
                  : `${p.name} — Not voted`
              "
              :class="
                p.vote !== null && p.vote !== undefined
                  ? '!bg-brand-teal !text-white !border-brand-teal'
                  : '!bg-brand-yellow !text-brand-blackish !border-brand-yellow'
              "
            />
          </div>
        </template>
      </Card>
    </section>

    <!-- Table -->
    <section class="relative">
      <div
        class="relative w-full h-[340px] rounded-2xl bg-brand-white shadow-card ring-1 ring-brand-grayLight overflow-hidden"
      >
        <Confetti
          v-if="confettiOn"
          :density="8"
          :durationMs="1600"
          :showPokemon="allSameNumber"
        />
        <transition name="fade">
          <div
            v-if="showCountdown"
            class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl font-bold text-brand-teal z-30"
          >
            {{ countdownNum }}
          </div>
        </transition>

        <div class="absolute inset-0">
          <div
            v-for="(p, i) in visiblePlayers"
            :key="p.uid"
            class="absolute left-1/2 top-1/2"
            :style="{ transform: seatTransform(i) }"
          >
            <PlayerSeat
              :name="p.name"
              :vote="
                p.uid === roomStore.meUid
                  ? norm(p.vote)
                  : revealed
                  ? norm(p.vote)
                  : null
              "
              :revealed="revealed"
            />
          </div>
        </div>

        <div
          v-if="!showCountdown"
          class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10"
        >
          <div
            v-if="!revealed && !hasVotes"
            class="px-5 py-2 rounded-full bg-brand-teal text-white text-sm shadow"
          >
            Pick a card
          </div>
          <transition name="scale">
            <Button
              v-if="!revealed && hasVotes"
              label="Reveal Cards"
              icon="pi pi-eye"
              class="!bg-brand-gray !border-brand-blackish mt-2"
              @click="triggerReveal"
            />
          </transition>
          <Button
            v-if="revealed"
            label="Start New Voting"
            icon="pi pi-refresh"
            class="!bg-brand-teal !border-brand-teal mt-2"
            @click="startNewVoting"
          />
        </div>
      </div>
    </section>

    <!-- Deck -->
    <section aria-labelledby="deck-title">
      <h3 id="deck-title" class="text-sm font-medium mb-2">Choose your card</h3>
      <div class="flex flex-wrap gap-2">
        <PlanningCard
          v-for="v in deck"
          :key="v"
          :label="v"
          :selected="myVote === v"
          :disabled="revealed || showCountdown"
          @select="cast(v)"
        />
      </div>
      <p class="mt-2 text-sm" aria-live="polite">
        Your vote: <b>{{ myVote ?? "—" }}</b>
      </p>
    </section>

    <!-- Result Modal -->
    <Dialog
      v-model:visible="showResultModal"
      modal
      :closable="true"
      :dismissableMask="true"
      :draggable="false"
      class="w-[95vw] max-w-md"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <i class="pi pi-star"></i>
          <span class="font-semibold">Round Result</span>
        </div>
      </template>

      <div class="text-center space-y-3">
        <div class="text-4xl font-extrabold text-brand-teal" aria-live="polite">
          {{ average !== null ? average : "—" }}
        </div>
        <p class="text-sm text-brand-gray/80">
          This is the average of all numeric votes.
        </p>
      </div>

      <template #footer>
        <Button label="Close" @click="closeResultModal" />
      </template>
    </Dialog>
  </main>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.scale-enter-active,
.scale-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.scale-enter-from,
.scale-leave-to {
  transform: scale(0.9);
  opacity: 0;
}
</style>
