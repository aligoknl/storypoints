<script setup lang="ts">
const props = defineProps<{
  name: string;
  vote: string | null;
  revealed: boolean;
}>();
</script>

<template>
  <div class="seat text-center select-none">
    <div
      class="card-3d"
      :class="{ 'is-flipped': vote !== null }"
      aria-live="polite"
      :aria-label="vote !== null ? `Card value ${vote}` : 'Hidden card'"
      role="img"
    >
      <div class="card-face card-front" aria-hidden="true">
        <div class="pattern"></div>
      </div>
      <div
        class="card-face card-back"
        aria-hidden="true"
      >
        <span class="value">{{ vote }}</span>
      </div>
    </div>

    <div
      class="mt-1 text-s font-medium text-brand-gray max-w-[96px] truncate"
      :title="props.name"
    >
      {{ props.name }}
    </div>
  </div>
</template>

<style scoped>
.seat {
  width: 40px;
}

.card-3d {
  width: 40px;
  height: 60px;
  position: relative;
  perspective: 800px;
}

.card-face {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  border: 2px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform-style: preserve-3d;
  transition: transform 420ms ease;
}

.card-front {
  background: #e6f7f3;
  display: grid;
  place-items: center;
}

.pattern {
  width: 70%;
  height: 70%;
  border-radius: 10px;
  background: repeating-linear-gradient(
    45deg,
    #009488 0 10px,
    #d8f2ee 10px 20px
  );
  filter: saturate(0.9);
}

.card-back {
  background: #ffffff;
  transform: rotateY(180deg);
  display: grid;
  place-items: center;
}

.value {
  font-weight: 800;
  font-size: 20px;
  color: #007a6a;
}

.is-flipped .card-front {
  transform: rotateY(180deg);
}
.is-flipped .card-back {
  transform: rotateY(360deg);
}
</style>
