<script setup lang="ts">
import { computed, onMounted, ref, onBeforeUnmount, watch, nextTick } from "vue";
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
import { getDisplayName } from "../utils/displayName";
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

const ROUND_DURATION = 60;
const BIG_DISAGREEMENT_THRESHOLD = 4;
const MIN_VOTE = 2;

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

onBeforeUnmount(() => {
  stopTimer();
});

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
const showDisagreement = ref<boolean>(false);

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
    const voteCount = Object.values(roomStore.players).filter(
      (p) => p.vote !== null && p.vote !== undefined
    ).length;

    const allowConfetti = voteCount >= MIN_VOTE && spreadInfo.value.spread < BIG_DISAGREEMENT_THRESHOLD;

    showDisagreement.value = spreadInfo.value.spread >= BIG_DISAGREEMENT_THRESHOLD;
    showResultModal.value = true;
    confettiOn.value = allowConfetti;

    if (resultTimeout) window.clearTimeout(resultTimeout);
    resultTimeout = window.setTimeout(() => {
      showResultModal.value = false;
      confettiOn.value = false;
      showDisagreement.value = false;
    }, 5000);
  }
});

const srAverageMsg = ref<string>("");

watch([revealed, average], async ([isRev, avg]) => {
  if (isRev && (avg !== null)) {
    await nextTick();
    srAverageMsg.value = `Average ${avg}`;
  } else if (!isRev) {
    srAverageMsg.value = "";
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

const triggerReveal = async (): Promise<void> => {
  await roomStore.startRevealCountdown();
};

const startRound = async (): Promise<void> => {
  await roomStore.startRoundCountdown();
};

const stopRound = async (): Promise<void> => {
  await roomStore.stopRoundCountdown();
};

const startNewVoting = async (): Promise<void> => {
  await roomStore.startNewVoting();
};

const copyLink = (): void => {
  const url = `${location.origin}`;
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

const spreadInfo = computed(() => {
  const arr = numericVotes.value;
  if (arr.length < 2) return { min: null as number | null, max: null as number | null, spread: 0 };
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  return { min, max, spread: max - min };
});

</script>

<template>
  <main class="p-6 max-w-5xl mx-auto space-y-6 text-brand-gray">
    <Toast class="dark:!bg-gray-800 dark:!text-gray-100" />
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-brand-teal dark:text-black">
          AllStoryPoints — {{ roomStore.roomId }}
        </h1>
        <p class="text-xl text-gray-600 dark:!text-black">
          Hello, <b>{{ roomStore.meName }}</b>
        </p>
      </div>
      <div class="flex gap-2">
        <RouterLink to="/" custom v-slot="{ navigate }">
          <Button type="button" label="Back to Home" icon="pi pi-home" @click="navigate"
            class="!border-brand-gray !bg-brand-gray dark:!text-white" />
        </RouterLink>
        <Button icon="pi pi-link" label="Copy link" @click="copyLink"
          class="!border-brand-tealMid dark:!text-white dark:!border-none" :class="{'!bg-brand-teal': true}" />
      </div>
    </header>

    <!-- Info cards -->
    <section class="grid gap-4 md:grid-cols-3">
      <Card>
        <template #title>Round Timer</template>
        <template #content>
          <div class="flex items-center gap-3">
            <div
              class="w-20 h-20 rounded-full bg-brand-tealLight text-brand-teal flex items-center justify-center text-2xl font-bold">
              {{ timeLeft }}
            </div>
            <div class="flex flex-col gap-2">
              <Button size="small" label="Start" @click="startRound" class="!bg-brand-teal dark:!text-white" />
              <Button size="small" label="Stop" severity="secondary" @click="stopRound" />
            </div>
          </div>
        </template>
      </Card>

      <Card>
        <template #title>Average</template>
        <template #content>
          <template v-if="revealed">
            <p v-if="average !== null" class="text-3xl font-bold text-brand-teal">
              {{ average }}
            </p>
            <p v-else class="text-sm text-brand-gray/90">
              No numeric votes yet (coffee & “?” ignored).
            </p>
          </template>
          <p v-else class="text-sm text-brand-gray/80 dark:!text-white">Revealed average appears here.</p>
        </template>
      </Card>

      <div class="sr-only" role="alert">
        {{ srAverageMsg }}
      </div>

      <Card>
        <template #title>Players</template>
        <template #content>
          <div class="flex flex-wrap gap-2">
            <Tag v-for="p in playersArr" :key="p.uid" :value="
      revealed
        ? `${getDisplayName(p.name)} — ${norm(p.vote) ?? '—'}`
        : norm(p.vote)
        ? p.uid === roomStore.meUid
          ? `${getDisplayName(p.name)} — ${norm(p.vote)}`
          : `${getDisplayName(p.name)} — Voted`
        : `${getDisplayName(p.name)} — Not voted`
    " :class="
      p.vote !== null && p.vote !== undefined
        ? '!bg-brand-teal !text-white !border-brand-teal'
        : '!bg-brand-yellow !text-brand-blackish !border-brand-yellow'
    " />
          </div>
        </template>
      </Card>
    </section>

    <!-- Table -->
    <section class="relative">
      <div
        class="relative w-full h-[340px] rounded-2xl bg-brand-white dark:bg-black shadow-card ring-1 ring-brand-grayLight dark:ring-brand-black overflow-hidden">
        <Confetti v-if="confettiOn" :density="8" :durationMs="1600" :showPokemon="allSameNumber" />
        <transition name="fade">
          <div v-if="showCountdown"
            class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl font-bold text-brand-teal dark:text-white z-30">
            {{ countdownNum }}
          </div>
        </transition>

        <div class="absolute inset-0">
          <div v-for="(p, i) in visiblePlayers" :key="p.uid" class="absolute left-1/2 top-1/2"
            :style="{ transform: seatTransform(i) }">
            <PlayerSeat :name="p.name" :vote="
                p.uid === roomStore.meUid
                  ? norm(p.vote)
                  : revealed
                  ? norm(p.vote)
                  : null
              " :revealed="revealed" />
          </div>
        </div>

        <div v-if="!showCountdown" class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10">
          <div v-if="!revealed && !hasVotes" class="px-5 py-2 rounded-full bg-brand-teal text-white text-sm shadow">
            Pick a card
          </div>
          <transition name="scale">
            <Button v-if="!revealed && hasVotes" label="Reveal Cards" icon="pi pi-eye"
              class="!bg-brand-gray !border-brand-blackish mt-2 dark:!text-white" @click="triggerReveal" />
          </transition>
          <Button v-if="revealed" label="Start New Voting" icon="pi pi-refresh"
            class="!bg-brand-teal !border-brand-teal mt-2 dark:!text-white" @click="startNewVoting" />
        </div>
      </div>
    </section>

    <!-- Deck -->
    <section v-if="!revealed && !showCountdown" aria-labelledby="deck-title">
      <h3 id="deck-title" class="text-sm font-medium mb-2 dark:!text-black">Choose your card</h3>
      <div class="flex flex-wrap gap-2">
        <PlanningCard v-for="v in deck" :key="v" :label="v" :selected="myVote === v" @select="cast(v)" />
      </div>
      <p class="mt-2 text-sm dark:!text-black" aria-live="polite">
        Your vote: <b>{{ myVote ?? "—" }}</b>
      </p>
    </section>

    <!-- Result Modal -->
    <Dialog v-model:visible="showResultModal" modal :closable="true" :dismissableMask="true" :draggable="false"
      class="w-[95vw] max-w-md">
      <template #header>
        <div class="flex items-center gap-2">
          <i class="pi pi-star"></i>
          <span class="font-semibold">Round Result</span>
        </div>
      </template>

      <div class="text-center space-y-3">
        <div class="text-4xl font-extrabold text-brand-teal dark:text-white">
          {{ average !== null ? average : "—" }}
        </div>
        <p v-if="!allSameNumber" class="text-sm text-brand-gray/80 dark:!text-white">
          This is the average of all numeric votes.
        </p>
        <p v-if="showDisagreement" class="text-sm text-brand-gray/80 dark:!text-white">
           Let’s discuss a bit more, we’re not aligned yet.
        </p>
        <p v-else class="text-sm text-brand-gray/80 dark:!text-white">
          All votes are the same! 🎉
        </p>
      </div>

      <template #footer>
        <Button label="Close" @click="closeResultModal" class="!bg-brand-teal dark:!text-brand-white" />
      </template>
    </Dialog>
    <transition name="fade">
      <img v-if="confettiOn && allSameNumber" src="../assets/pikachu-dance.gif" alt="Pikachu celebration"
        class="absolute inset-0 m-auto w-max h-max z-[10000] pointer-events-none" />
    </transition>
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
