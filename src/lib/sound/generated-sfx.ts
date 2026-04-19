"use client";

import { Howl } from "howler";

export type SoundName =
  | "start"
  | "click"
  | "transition"
  | "correct"
  | "wrong"
  | "points"
  | "rankUp"
  | "gallery"
  | "photo"
  | "upload"
  | "celebration";

export type Waveform = "sine" | "triangle" | "square" | "noise";

export type Tone = {
  start: number;
  duration: number;
  frequency: number;
  endFrequency?: number;
  gain: number;
  waveform: Waveform;
  attack?: number;
  release?: number;
  tremoloRate?: number;
  tremoloDepth?: number;
};

type SoundBlueprint = {
  volume: number;
  tones: Tone[];
};

const SAMPLE_RATE = 22_050;
const cache = new Map<SoundName, Howl>();

export const SOUND_NAMES = [
  "start",
  "click",
  "transition",
  "correct",
  "wrong",
  "points",
  "rankUp",
  "gallery",
  "photo",
  "upload",
  "celebration",
] as const satisfies SoundName[];

export const soundBlueprints: Record<SoundName, SoundBlueprint> = {
  start: {
    volume: 0.82,
    tones: [
      {
        start: 0,
        duration: 0.14,
        frequency: 320,
        endFrequency: 392,
        gain: 0.09,
        waveform: "sine",
        release: 0.08,
      },
      {
        start: 0.03,
        duration: 0.18,
        frequency: 392,
        endFrequency: 523.25,
        gain: 0.18,
        waveform: "triangle",
        attack: 0.006,
        release: 0.1,
      },
      {
        start: 0.11,
        duration: 0.24,
        frequency: 659.25,
        endFrequency: 783.99,
        gain: 0.11,
        waveform: "sine",
        tremoloRate: 10,
        tremoloDepth: 0.16,
      },
      {
        start: 0.2,
        duration: 0.05,
        frequency: 1400,
        gain: 0.03,
        waveform: "noise",
        attack: 0.001,
        release: 0.04,
      },
    ],
  },
  click: {
    volume: 0.74,
    tones: [
      {
        start: 0,
        duration: 0.014,
        frequency: 1200,
        gain: 0.06,
        waveform: "noise",
        attack: 0.001,
        release: 0.012,
      },
      {
        start: 0,
        duration: 0.055,
        frequency: 680,
        endFrequency: 940,
        gain: 0.18,
        waveform: "triangle",
        attack: 0.002,
        release: 0.04,
      },
      {
        start: 0.012,
        duration: 0.082,
        frequency: 1260,
        endFrequency: 980,
        gain: 0.08,
        waveform: "sine",
        attack: 0.003,
        release: 0.06,
      },
    ],
  },
  transition: {
    volume: 0.74,
    tones: [
      {
        start: 0,
        duration: 0.14,
        frequency: 410,
        endFrequency: 560,
        gain: 0.11,
        waveform: "sine",
        release: 0.1,
      },
      {
        start: 0.025,
        duration: 0.2,
        frequency: 560,
        endFrequency: 710,
        gain: 0.12,
        waveform: "triangle",
        attack: 0.006,
        release: 0.12,
      },
      {
        start: 0.07,
        duration: 0.16,
        frequency: 930,
        endFrequency: 760,
        gain: 0.05,
        waveform: "sine",
        tremoloRate: 7,
        tremoloDepth: 0.1,
      },
    ],
  },
  correct: {
    volume: 0.78,
    tones: [
      {
        start: 0,
        duration: 0.1,
        frequency: 523.25,
        endFrequency: 587.33,
        gain: 0.14,
        waveform: "triangle",
      },
      {
        start: 0.03,
        duration: 0.14,
        frequency: 659.25,
        endFrequency: 698.46,
        gain: 0.13,
        waveform: "triangle",
      },
      {
        start: 0.07,
        duration: 0.2,
        frequency: 783.99,
        endFrequency: 880,
        gain: 0.09,
        waveform: "sine",
      },
    ],
  },
  wrong: {
    volume: 0.7,
    tones: [
      {
        start: 0,
        duration: 0.08,
        frequency: 310,
        endFrequency: 280,
        gain: 0.12,
        waveform: "triangle",
      },
      {
        start: 0.05,
        duration: 0.14,
        frequency: 250,
        endFrequency: 196,
        gain: 0.12,
        waveform: "sine",
      },
      {
        start: 0,
        duration: 0.018,
        frequency: 900,
        gain: 0.03,
        waveform: "noise",
      },
    ],
  },
  points: {
    volume: 0.78,
    tones: [
      {
        start: 0,
        duration: 0.06,
        frequency: 740,
        endFrequency: 910,
        gain: 0.1,
        waveform: "triangle",
      },
      {
        start: 0.035,
        duration: 0.11,
        frequency: 1040,
        endFrequency: 1240,
        gain: 0.08,
        waveform: "sine",
      },
      {
        start: 0.01,
        duration: 0.022,
        frequency: 1320,
        gain: 0.02,
        waveform: "noise",
        attack: 0.001,
        release: 0.02,
      },
    ],
  },
  rankUp: {
    volume: 0.82,
    tones: [
      {
        start: 0,
        duration: 0.1,
        frequency: 440,
        endFrequency: 523.25,
        gain: 0.12,
        waveform: "sine",
      },
      {
        start: 0.04,
        duration: 0.14,
        frequency: 523.25,
        endFrequency: 659.25,
        gain: 0.14,
        waveform: "triangle",
      },
      {
        start: 0.1,
        duration: 0.18,
        frequency: 659.25,
        endFrequency: 880,
        gain: 0.11,
        waveform: "triangle",
      },
      {
        start: 0.16,
        duration: 0.08,
        frequency: 1320,
        gain: 0.03,
        waveform: "noise",
      },
    ],
  },
  gallery: {
    volume: 0.74,
    tones: [
      {
        start: 0,
        duration: 0.12,
        frequency: 392,
        endFrequency: 415.3,
        gain: 0.11,
        waveform: "sine",
      },
      {
        start: 0.04,
        duration: 0.16,
        frequency: 587.33,
        endFrequency: 659.25,
        gain: 0.1,
        waveform: "sine",
      },
      {
        start: 0.08,
        duration: 0.18,
        frequency: 784,
        endFrequency: 698.46,
        gain: 0.05,
        waveform: "triangle",
        tremoloRate: 7,
        tremoloDepth: 0.1,
      },
    ],
  },
  photo: {
    volume: 0.78,
    tones: [
      {
        start: 0,
        duration: 0.018,
        frequency: 1600,
        gain: 0.15,
        waveform: "noise",
        attack: 0.001,
        release: 0.015,
      },
      {
        start: 0.01,
        duration: 0.075,
        frequency: 820,
        endFrequency: 460,
        gain: 0.14,
        waveform: "triangle",
        release: 0.05,
      },
      {
        start: 0.02,
        duration: 0.06,
        frequency: 1100,
        endFrequency: 820,
        gain: 0.06,
        waveform: "sine",
      },
    ],
  },
  upload: {
    volume: 0.82,
    tones: [
      {
        start: 0,
        duration: 0.08,
        frequency: 520,
        endFrequency: 650,
        gain: 0.11,
        waveform: "triangle",
      },
      {
        start: 0.04,
        duration: 0.14,
        frequency: 690,
        endFrequency: 880,
        gain: 0.1,
        waveform: "sine",
      },
      {
        start: 0.08,
        duration: 0.16,
        frequency: 980,
        endFrequency: 1180,
        gain: 0.06,
        waveform: "triangle",
      },
    ],
  },
  celebration: {
    volume: 0.86,
    tones: [
      {
        start: 0,
        duration: 0.1,
        frequency: 392,
        endFrequency: 440,
        gain: 0.1,
        waveform: "sine",
      },
      {
        start: 0.04,
        duration: 0.12,
        frequency: 523.25,
        endFrequency: 587.33,
        gain: 0.12,
        waveform: "triangle",
      },
      {
        start: 0.1,
        duration: 0.16,
        frequency: 659.25,
        endFrequency: 739.99,
        gain: 0.12,
        waveform: "triangle",
      },
      {
        start: 0.16,
        duration: 0.22,
        frequency: 783.99,
        endFrequency: 880,
        gain: 0.09,
        waveform: "sine",
        tremoloRate: 9,
        tremoloDepth: 0.12,
      },
      {
        start: 0.2,
        duration: 0.1,
        frequency: 1600,
        gain: 0.04,
        waveform: "noise",
        attack: 0.001,
        release: 0.08,
      },
    ],
  },
};

function sampleWave(waveform: Waveform, phase: number) {
  switch (waveform) {
    case "triangle":
      return (2 / Math.PI) * Math.asin(Math.sin(phase));
    case "square":
      return Math.sign(Math.sin(phase));
    case "noise":
      return Math.random() * 2 - 1;
    default:
      return Math.sin(phase);
  }
}

function envelope(position: number, tone: Tone) {
  const attack = tone.attack ?? Math.min(0.02, tone.duration * 0.25);
  const release = tone.release ?? Math.min(0.12, tone.duration * 0.35);

  if (position < attack) {
    return position / attack;
  }

  if (position > tone.duration - release) {
    return Math.max((tone.duration - position) / release, 0);
  }

  return 1;
}

function frequencyAt(tone: Tone, position: number) {
  if (!tone.endFrequency || tone.endFrequency === tone.frequency) {
    return tone.frequency;
  }

  const progress = Math.min(Math.max(position / tone.duration, 0), 1);
  return tone.frequency + (tone.endFrequency - tone.frequency) * progress;
}

function sampleTone(tone: Tone, position: number) {
  const env = envelope(position, tone);
  const currentFrequency = frequencyAt(tone, position);
  const averageFrequency = (tone.frequency + currentFrequency) / 2;
  const phase = 2 * Math.PI * averageFrequency * position;
  let sample = sampleWave(tone.waveform, phase);

  if (tone.tremoloRate && tone.tremoloDepth) {
    const tremolo =
      1 - tone.tremoloDepth +
      tone.tremoloDepth * ((Math.sin(2 * Math.PI * tone.tremoloRate * position) + 1) / 2);
    sample *= tremolo;
  }

  return sample * tone.gain * env;
}

function softClip(value: number) {
  return Math.tanh(value * 1.18);
}

function toBase64(bytes: Uint8Array) {
  let binary = "";

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return window.btoa(binary);
}

function getTotalDuration(tones: Tone[]) {
  return Math.max(...tones.map((tone) => tone.start + tone.duration)) + 0.02;
}

export function renderSoundWavBytes(name: SoundName) {
  const blueprint = soundBlueprints[name];
  const totalDuration = getTotalDuration(blueprint.tones);
  const frameCount = Math.ceil(totalDuration * SAMPLE_RATE);
  const bytes = new Uint8Array(44 + frameCount * 2);
  const view = new DataView(bytes.buffer);
  const samples = new Float32Array(frameCount);
  let max = 0;

  for (let index = 0; index < frameCount; index += 1) {
    const time = index / SAMPLE_RATE;
    let value = 0;

    for (const tone of blueprint.tones) {
      if (time < tone.start || time > tone.start + tone.duration) {
        continue;
      }

      value += sampleTone(tone, time - tone.start);
    }

    value = softClip(value);
    max = Math.max(max, Math.abs(value));
    samples[index] = value;
  }

  const normalizer = max === 0 ? 1 : 0.9 / max;
  for (let index = 0; index < frameCount; index += 1) {
    view.setInt16(
      44 + index * 2,
      Math.round(samples[index] * normalizer * 32_767),
      true,
    );
  }

  "RIFF".split("").forEach((char, index) => view.setUint8(index, char.charCodeAt(0)));
  view.setUint32(4, 36 + frameCount * 2, true);
  "WAVE".split("").forEach((char, index) => view.setUint8(8 + index, char.charCodeAt(0)));
  "fmt ".split("").forEach((char, index) => view.setUint8(12 + index, char.charCodeAt(0)));
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  "data".split("").forEach((char, index) => view.setUint8(36 + index, char.charCodeAt(0)));
  view.setUint32(40, frameCount * 2, true);

  return bytes;
}

export function renderSoundDataUri(name: SoundName) {
  return `data:audio/wav;base64,${toBase64(renderSoundWavBytes(name))}`;
}

function makeSound(name: SoundName) {
  const blueprint = soundBlueprints[name];

  return new Howl({
    src: [renderSoundDataUri(name)],
    volume: blueprint.volume,
    preload: true,
  });
}

export function getHowl(name: SoundName) {
  const existing = cache.get(name);
  if (existing) {
    return existing;
  }

  const howl = makeSound(name);
  cache.set(name, howl);
  return howl;
}
