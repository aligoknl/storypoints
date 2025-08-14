<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useRoomStore } from "../stores/room";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Card from "primevue/card";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";

const roomStore = useRoomStore();
const router = useRouter();
const toast = useToast();

const createRoomName = ref<string>("");
const createYourName = ref<string>("");

const joinRoomName = ref<string>("");
const joinYourName = ref<string>("");

onMounted(() => {
  const saved = localStorage.getItem("sp_name");
  if (saved) {
    createYourName.value = saved;
    joinYourName.value = saved;
  }
});

const saveNameLocally = (name: string) => {
  const trimmed = name.trim();
  if (trimmed) localStorage.setItem("sp_name", trimmed);
};

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

const showError = (summary: string, detail?: string) =>
  toast.add({ severity: "error", summary, detail, life: 3500 });

const showSuccess = (summary: string, detail?: string) =>
  toast.add({ severity: "success", summary, detail, life: 2500 });

const handleCreate = async (): Promise<void> => {
  if (!createRoomName.value.trim() || !createYourName.value.trim()) {
    showError("Missing info", "Enter both a room name and your name.");
    return;
  }
  try {
    await roomStore.createRoom(createRoomName.value, createYourName.value);
    saveNameLocally(createYourName.value);
    showSuccess("Room created", `Room: ${roomStore.roomId}`);
    router.push(
      `/room/${roomStore.roomId}?name=${encodeURIComponent(
        createYourName.value
      )}`
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    showError("Could not create room", msg);
  }
};

const handleJoin = async (): Promise<void> => {
  if (!joinRoomName.value.trim() || !joinYourName.value.trim()) {
    showError("Missing info", "Enter both a room name and your name.");
    return;
  }
  const slug = slugify(joinRoomName.value);
  try {
    await roomStore.joinRoom(slug, joinYourName.value);
    saveNameLocally(joinYourName.value);
    showSuccess("Joined room", `Room: ${slug}`);
    router.push(`/room/${slug}?name=${encodeURIComponent(joinYourName.value)}`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    showError("Could not join room", msg);
  }
};
</script>

<template>
  <main class="p-6 max-w-xl mx-auto space-y-6">
    <!-- Toast host -->
    <Toast />

    <h1 class="text-3xl font-bold text-brand-teal text-center">StoryPoints</h1>

    <!-- Join -->
    <Card>
      <template #title>Join a Room</template>
      <template #content>
        <div class="flex flex-col gap-3">
          <InputText
            v-model="joinRoomName"
            placeholder="Room name"
            class="w-full"
          />
          <InputText
            v-model="joinYourName"
            placeholder="Your name"
            class="w-full"
          />
          <Button
            label="Join Room"
            class="self-start !bg-brand-yellow !border-brand-yellow hover:!bg-brand-yellowMid !text-brand-blackish"
            @click="handleJoin"
          />
        </div>
      </template>
    </Card>

    <!-- OR divider -->
    <div class="flex items-center gap-3 text-sm text-gray-500">
      <div class="h-px flex-1 bg-gray-200"></div>
      <span class="tracking-wider text-gray-500">— OR —</span>
      <div class="h-px flex-1 bg-gray-200"></div>
    </div>

    <!-- Create -->
    <Card>
      <template #title>Create a Room</template>
      <template #content>
        <div class="flex flex-col gap-3">
          <InputText
            v-model="createRoomName"
            placeholder="Room name (e.g., Emerald)"
            class="w-full"
          />
          <InputText
            v-model="createYourName"
            placeholder="Your name"
            class="w-full"
          />
          <Button
            label="Create Room"
            class="self-start !bg-brand-teal !border-brand-teal hover:!bg-brand-tealMid"
            @click="handleCreate"
          />
        </div>
      </template>
    </Card>

    <!-- Footer -->
    <footer class="pt-6 text-center text-xs text-gray-500">
      Created by • Ali Gök • © 2025
    </footer>
  </main>
</template>
