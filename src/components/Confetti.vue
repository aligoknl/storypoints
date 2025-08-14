<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";

const props = withDefaults(
  defineProps<{
    durationMs?: number;
    density?: number;
    showPokemon?: boolean;
  }>(),
  {
    durationMs: 2500,
    density: 12,
    showPokemon: false,
  }
);

const emit = defineEmits<{ (e: "done"): void }>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;
let raf = 0;
let emitUntil = 0;

type Piece = {
  kind: "rect" | "pokeball";
  born: number;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  color: string;
  alpha: number;
};

const pieces: Piece[] = [];
const palette = ["#007A6A", "#00B8A9", "#FFD700", "#00A651", "#FF6F00"];

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function resize() {
  const c = canvasRef.value!;
  const parent = c.parentElement!;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  c.width = parent.clientWidth * dpr;
  c.height = parent.clientHeight * dpr;
  c.style.width = parent.clientWidth + "px";
  c.style.height = parent.clientHeight + "px";
  ctx = c.getContext("2d");
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function emitBurst() {
  const c = canvasRef.value!;
  const w = c.clientWidth;

  for (let i = 0; i < props.density; i++) {
    const isPokeball = props.showPokemon;
    pieces.push({
      kind: isPokeball ? "pokeball" : "rect",
      born: performance.now(),
      x: rand(0, w),
      y: -20,
      w: isPokeball ? rand(26, 36) : rand(6, 10),
      h: isPokeball ? 0 : rand(8, 14),
      vx: rand(-0.8, 0.8),
      vy: rand(2.5, 4),
      rot: 0,
      vr: rand(-0.08, 0.08),
      color: palette[Math.floor(Math.random() * palette.length)],
      alpha: 1,
    });
  }
}

function drawPokeball(ctx: CanvasRenderingContext2D, size: number) {
  const r = size / 2;
  // white bottom
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI, true);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  // red top
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI, false);
  ctx.fillStyle = "#FF0000";
  ctx.fill();
  // black center band
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(r, 0);
  ctx.lineWidth = size * 0.12;
  ctx.strokeStyle = "#000000";
  ctx.stroke();
  // center button outer
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.lineWidth = size * 0.05;
  ctx.strokeStyle = "#000000";
  ctx.stroke();
  // inner button
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.08, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
}

function step() {
  const c = canvasRef.value!;
  if (!ctx) return;
  const w = c.clientWidth;
  const h = c.clientHeight;

  ctx.clearRect(0, 0, w, h);

  if (performance.now() < emitUntil) {
    emitBurst();
  }

  for (let i = pieces.length - 1; i >= 0; i--) {
    const p = pieces[i];
    p.vy += 0.06; // gravity
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.alpha -= 0.005;

    if (p.alpha <= 0 || p.y > h + 50) {
      pieces.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);

    if (p.kind === "pokeball") {
      drawPokeball(ctx, p.w);
    } else {
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    }
    ctx.restore();
  }

  if (performance.now() >= emitUntil && pieces.length === 0) {
    cancelAnimationFrame(raf);
    raf = 0;
    emit("done");
    return;
  }
  raf = requestAnimationFrame(step);
}

onMounted(() => {
  resize();
  emitUntil = performance.now() + props.durationMs;
  raf = requestAnimationFrame(step);
  window.addEventListener("resize", resize);
});

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf);
  window.removeEventListener("resize", resize);
});
</script>

<template>
  <canvas ref="canvasRef" class="absolute inset-0 pointer-events-none"></canvas>
</template>
