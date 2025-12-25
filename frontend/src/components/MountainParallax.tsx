'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ============================================================================
// Seeded RNG (cyrb128 + mulberry32) - Exact v6 implementation
// ============================================================================

function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703,
    h2 = 3144134277,
    h3 = 1013904242,
    h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

function mulberry32(a: number): () => number {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================================
// Utility Functions - Exact v6 implementation
// ============================================================================

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ============================================================================
// Core Shape Utilities - Exact v6 implementation
// ============================================================================

function midpointDisplacement(n: number, rng: () => number, roughness: number): Float32Array {
  const arr = new Float32Array(n);
  arr[0] = 0;
  arr[n - 1] = 0;

  let step = n - 1;
  let disp = 1;

  while (step > 1) {
    const half = step / 2;
    for (let i = 0; i < n - 1; i += step) {
      const mid = i + half;
      const avg = (arr[i] + arr[i + step]) * 0.5;
      arr[mid] = avg + (rng() - 0.5) * disp;
    }
    step = half;
    disp *= roughness;
  }
  return arr;
}

function normalise01(arr: Float32Array): Float32Array {
  let mn = Infinity,
    mx = -Infinity;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (v < mn) mn = v;
    if (v > mx) mx = v;
  }
  const out = new Float32Array(arr.length);
  const denom = mx - mn || 1;
  for (let i = 0; i < arr.length; i++) {
    out[i] = (arr[i] - mn) / denom;
  }
  return out;
}

function addGaussian(arr: Float32Array, center: number, amp: number, width: number): void {
  const n = arr.length;
  const twoSigma2 = 2 * width * width;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const d = t - center;
    arr[i] += amp * Math.exp(-(d * d) / twoSigma2);
  }
}

function addPeaksAtCenters(
  arr: Float32Array,
  rng: () => number,
  centers: number[],
  ampMin: number,
  ampMax: number,
  widthMin: number,
  widthMax: number,
  jitter: number,
  weights: number[] | null
): void {
  for (let idx = 0; idx < centers.length; idx++) {
    const c = centers[idx];
    const w = weights ? clamp(weights[idx] ?? 1, 0.2, 1.2) : 1;

    const center = clamp(c + (rng() - 0.5) * jitter, 0.04, 0.96);

    let amp = lerp(ampMin, ampMax, rng());
    amp *= w;

    let width = lerp(widthMin, widthMax, rng());
    // Lower weights => broader peaks (avoids sharp spikes)
    width *= 1 + (1 - w) * 0.45;

    addGaussian(arr, center, amp, width);
  }
}

function addValleysAtCenters(
  arr: Float32Array,
  rng: () => number,
  centers: number[],
  ampMin: number,
  ampMax: number,
  widthMin: number,
  widthMax: number,
  jitter: number
): void {
  for (const c of centers) {
    const center = clamp(c + (rng() - 0.5) * jitter, 0.04, 0.96);
    const amp = lerp(ampMin, ampMax, rng()); // negative
    const width = lerp(widthMin, widthMax, rng());
    addGaussian(arr, center, amp, width);
  }
}

function ridgeify01(x: number): number {
  const r = 1 - Math.abs(2 * x - 1);
  return clamp(r, 0, 1);
}

function slopeLimit(arr: Float32Array, maxDelta: number): void {
  for (let i = 1; i < arr.length; i++) {
    const lo = arr[i - 1] - maxDelta;
    const hi = arr[i - 1] + maxDelta;
    arr[i] = clamp(arr[i], lo, hi);
  }
  for (let i = arr.length - 2; i >= 0; i--) {
    const lo = arr[i + 1] - maxDelta;
    const hi = arr[i + 1] + maxDelta;
    arr[i] = clamp(arr[i], lo, hi);
  }
}

function smoothMovingAverage(arr: Float32Array, radius: number): void {
  if (radius <= 0) return;
  const n = arr.length;
  const tmp = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0,
      cnt = 0;
    const a = Math.max(0, i - radius);
    const b = Math.min(n - 1, i + radius);
    for (let j = a; j <= b; j++) {
      sum += arr[j];
      cnt++;
    }
    tmp[i] = sum / cnt;
  }
  for (let i = 0; i < n; i++) arr[i] = tmp[i];
}

function compressRange01(arr: Float32Array, rangeScale: number, center: number): void {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = clamp(center + (arr[i] - center) * rangeScale, 0, 1);
  }
}

// ============================================================================
// Layer Configuration Types
// ============================================================================

interface CenterDip {
  center: number;
  amp: number;
  width: number;
}

interface LayerConfig {
  id: string;
  seed: string;
  baseY: number;
  height: number;
  speed: number;
  peakCenters: number[];
  peakWeights: number[];
  valleyCenters: number[];
  centerDip: CenterDip;
  centerSaddle?: CenterDip;
  roughness: number;
  sharpness: number;
  detailRoughness: number;
  detailAmount: number;
  rangeScale: number;
  maxDelta: number;
  smoothRadius: number;
}

// ============================================================================
// Common Parameters & Layer Definitions - Exact v6
// ============================================================================

const COMMON = {
  roughness: 0.52,
  sharpness: 1.22,
  detailRoughness: 0.6,
  detailAmount: 0.14,
  rangeScale: 0.62,
  maxDelta: 0.024,
  smoothRadius: 6,
};

const PATTERNS = [
  {
    peaks: [0.16, 0.84, 0.62],
    weights: [1.0, 0.85, 0.75],
    valleys: [0.46, 0.72],
    dip: { center: 0.47, amp: -0.07, width: 0.24 },
  },
  {
    peaks: [0.24, 0.9, 0.42],
    weights: [0.85, 1.0, 0.75],
    valleys: [0.54, 0.78],
    dip: { center: 0.54, amp: -0.07, width: 0.24 },
  },
  {
    peaks: [0.12, 0.76, 0.92],
    weights: [0.95, 0.85, 0.7],
    valleys: [0.48, 0.66],
    dip: { center: 0.49, amp: -0.06, width: 0.26 },
  },
  // mnt-4: softened right peak
  {
    peaks: [0.2, 0.86, 0.58],
    weights: [0.95, 0.55, 0.8],
    valleys: [0.57, 0.74],
    dip: { center: 0.57, amp: -0.06, width: 0.25 },
  },
  {
    peaks: [0.1, 0.74, 0.92],
    weights: [0.95, 0.8, 0.7],
    valleys: [0.51, 0.68],
    dip: { center: 0.51, amp: -0.06, width: 0.26 },
  },
];

const LAYER_CONFIGS: LayerConfig[] = [
  {
    id: 'mnt-1',
    seed: 'mnt-1-v6',
    baseY: 305,
    height: 100,
    speed: 0.02,
    peakCenters: PATTERNS[0].peaks,
    peakWeights: PATTERNS[0].weights,
    valleyCenters: PATTERNS[0].valleys,
    centerDip: PATTERNS[0].dip,
    ...COMMON,
  },
  {
    id: 'mnt-2',
    seed: 'mnt-2-v6',
    baseY: 345,
    height: 118,
    speed: 0.05,
    peakCenters: PATTERNS[1].peaks,
    peakWeights: PATTERNS[1].weights,
    valleyCenters: PATTERNS[1].valleys,
    centerDip: PATTERNS[1].dip,
    ...COMMON,
  },
  {
    id: 'mnt-3',
    seed: 'mnt-3-v6',
    baseY: 405,
    height: 140,
    speed: 0.1,
    peakCenters: PATTERNS[2].peaks,
    peakWeights: PATTERNS[2].weights,
    valleyCenters: PATTERNS[2].valleys,
    centerDip: PATTERNS[2].dip,
    ...COMMON,
  },
  {
    id: 'mnt-4',
    seed: 'mnt-4-v6',
    baseY: 475,
    height: 160,
    speed: 0.2,
    peakCenters: PATTERNS[3].peaks,
    peakWeights: PATTERNS[3].weights,
    valleyCenters: PATTERNS[3].valleys,
    centerDip: PATTERNS[3].dip,
    ...COMMON,
  },
  {
    id: 'mnt-5',
    seed: 'mnt-5-v6',
    baseY: 570,
    height: 168,
    speed: 0.35,
    peakCenters: PATTERNS[4].peaks,
    peakWeights: PATTERNS[4].weights,
    valleyCenters: PATTERNS[4].valleys,
    centerDip: PATTERNS[4].dip,
    centerSaddle: { center: 0.5, amp: -0.1, width: 0.12 },
    ...COMMON,
  },
];

// Layer colors from prototype - exact hex values
const LAYER_FILLS = [
  '#CDE6F5', // Layer 1: Back/Farthest (Hazy, Lightest)
  '#9BC2E0', // Layer 2
  '#6B9AC4', // Layer 3 (Mid)
  '#4878A8', // Layer 4
  '#204E78', // Layer 5: Front/Closest (Darkest)
];

// ============================================================================
// Build Mountain Profile - Exact v6 logic
// ============================================================================

function buildMountainProfile(layer: LayerConfig): Float32Array {
  const N = 1025;

  const seed = cyrb128(layer.seed);
  const rngMain = mulberry32(seed[0]);
  const rngDetail = mulberry32(seed[1]);

  const baseRaw = midpointDisplacement(N, rngMain, layer.roughness);

  addPeaksAtCenters(
    baseRaw,
    rngMain,
    layer.peakCenters,
    0.3,
    0.62,
    0.09,
    0.18,
    0.012,
    layer.peakWeights
  );

  addValleysAtCenters(baseRaw, rngMain, layer.valleyCenters, -0.13, -0.06, 0.2, 0.34, 0.014);

  if (layer.centerDip) {
    addGaussian(baseRaw, layer.centerDip.center, layer.centerDip.amp, layer.centerDip.width);
  }

  if (layer.centerSaddle) {
    addGaussian(baseRaw, layer.centerSaddle.center, layer.centerSaddle.amp, layer.centerSaddle.width);
  }

  let base = normalise01(baseRaw);

  // Apply sharpness exponent
  for (let i = 0; i < base.length; i++) {
    base[i] = Math.pow(clamp(base[i], 0, 1), layer.sharpness);
  }

  // Detail layer
  const detailRaw = midpointDisplacement(N, rngDetail, layer.detailRoughness);
  const detail = normalise01(detailRaw);
  for (let i = 0; i < detail.length; i++) {
    const r = ridgeify01(detail[i]);
    detail[i] = Math.pow(r, 1.35);
  }

  // Combine base + detail with peak mask
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const peakMask = Math.pow(base[i], 0.65);
    const v = base[i] + (detail[i] - 0.5) * layer.detailAmount * peakMask;
    out[i] = clamp(v, 0, 1);
  }

  compressRange01(out, layer.rangeScale, 0.52);
  slopeLimit(out, layer.maxDelta);
  smoothMovingAverage(out, layer.smoothRadius);

  // Smooth out low values
  for (let i = 1; i < N - 1; i++) {
    if (out[i] < 0.2) {
      out[i] = (out[i - 1] + out[i] + out[i + 1]) / 3;
    }
  }

  return out;
}

// ============================================================================
// Generate SVG Path from Profile
// ============================================================================

const SVG_W = 1200;
const SVG_H = 600;

function generatePath(profile: Float32Array, layer: LayerConfig): string {
  const margin = 60;
  const resolution = 3;

  let d = `M ${-margin} ${SVG_H} `;

  for (let x = -margin; x <= SVG_W + margin; x += resolution) {
    const xClamped = clamp(x, 0, SVG_W);
    const t = xClamped / SVG_W;
    const idx = Math.round(t * (profile.length - 1));
    const h = profile[idx];

    const y = layer.baseY - h * layer.height;
    d += `L ${x} ${y.toFixed(2)} `;
  }

  d += `L ${SVG_W + margin} ${SVG_H} Z`;
  return d;
}

// ============================================================================
// Mountain Parallax Component
// ============================================================================

export default function MountainParallax() {
  const [paths, setPaths] = useState<string[]>([]);
  const [transforms, setTransforms] = useState<string[]>(LAYER_CONFIGS.map(() => 'translateY(0px)'));
  const profilesRef = useRef<Map<string, Float32Array>>(new Map());

  // Generate all profiles and paths
  const generateMountains = useCallback(() => {
    const newPaths: string[] = [];

    LAYER_CONFIGS.forEach((layer) => {
      // Check if profile already exists
      if (!profilesRef.current.has(layer.id)) {
        profilesRef.current.set(layer.id, buildMountainProfile(layer));
      }

      const profile = profilesRef.current.get(layer.id)!;
      const path = generatePath(profile, layer);
      newPaths.push(path);
    });

    setPaths(newPaths);
  }, []);

  // Handle scroll - update transforms
  const handleScroll = useCallback(() => {
    const scrollY = window.scrollY;
    const newTransforms = LAYER_CONFIGS.map((layer) => `translateY(${scrollY * layer.speed}px)`);
    setTransforms(newTransforms);
  }, []);

  // Initialize and set up event listeners
  useEffect(() => {
    generateMountains();
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });

    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        profilesRef.current.clear();
        generateMountains();
      }, 120);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, [generateMountains, handleScroll]);

  return (
    <div
      className="fixed inset-0 w-full h-screen overflow-hidden pointer-events-none"
      style={{
        zIndex: -1,
        background: 'linear-gradient(180deg, #F9FBFD 0%, #D8EBF7 50%, #B6CFE8 100%)',
      }}
      aria-hidden="true"
    >
      {paths.map((path, i) => (
        <svg
          key={LAYER_CONFIGS[i].id}
          className="absolute left-0 bottom-0 w-full h-full"
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          preserveAspectRatio="none"
          style={{
            transform: transforms[i],
            willChange: 'transform',
          }}
        >
          <path d={path} fill={LAYER_FILLS[i]} />
        </svg>
      ))}
    </div>
  );
}
