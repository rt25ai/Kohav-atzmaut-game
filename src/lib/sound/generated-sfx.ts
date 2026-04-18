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

type Waveform = "sine" | "triangle" | "square" | "noise";

type Tone = {
  start: number;
  duration: number;
  frequency: number;
  gain: number;
  waveform: Waveform;
};

const SAMPLE_RATE = 22_050;
const cache = new Map<SoundName, Howl>();

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

function envelope(position: number, duration: number) {
  const attack = Math.min(0.02, duration * 0.25);
  const release = Math.min(0.12, duration * 0.35);

  if (position < attack) {
    return position / attack;
  }

  if (position > duration - release) {
    return Math.max((duration - position) / release, 0);
  }

  return 1;
}

function toBase64(bytes: Uint8Array) {
  let binary = "";

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return window.btoa(binary);
}

function toWavDataUri(tones: Tone[], totalDuration: number) {
  const frameCount = Math.ceil(totalDuration * SAMPLE_RATE);
  const bytes = new Uint8Array(44 + frameCount * 2);
  const view = new DataView(bytes.buffer);
  let max = 0;
  const samples = new Int16Array(frameCount);

  for (let index = 0; index < frameCount; index += 1) {
    const time = index / SAMPLE_RATE;
    let value = 0;

    for (const tone of tones) {
      if (time < tone.start || time > tone.start + tone.duration) {
        continue;
      }

      const position = time - tone.start;
      const env = envelope(position, tone.duration);
      const phase = 2 * Math.PI * tone.frequency * position;
      value += sampleWave(tone.waveform, phase) * tone.gain * env;
    }

    max = Math.max(max, Math.abs(value));
    samples[index] = value as unknown as number;
  }

  const normalizer = max === 0 ? 1 : 0.9 / max;
  for (let index = 0; index < frameCount; index += 1) {
    view.setInt16(44 + index * 2, Math.round(samples[index] * normalizer * 32_767), true);
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

  return `data:audio/wav;base64,${toBase64(bytes)}`;
}

function makeSound(name: SoundName) {
  const definitions: Record<SoundName, Tone[]> = {
    start: [
      { start: 0, duration: 0.16, frequency: 392, gain: 0.45, waveform: "triangle" },
      { start: 0.1, duration: 0.18, frequency: 523.25, gain: 0.45, waveform: "triangle" },
      { start: 0.2, duration: 0.28, frequency: 659.25, gain: 0.42, waveform: "triangle" },
    ],
    click: [{ start: 0, duration: 0.06, frequency: 880, gain: 0.35, waveform: "square" }],
    transition: [
      { start: 0, duration: 0.18, frequency: 760, gain: 0.28, waveform: "triangle" },
      { start: 0.06, duration: 0.22, frequency: 530, gain: 0.26, waveform: "triangle" },
    ],
    correct: [
      { start: 0, duration: 0.12, frequency: 523.25, gain: 0.45, waveform: "triangle" },
      { start: 0.03, duration: 0.16, frequency: 659.25, gain: 0.4, waveform: "triangle" },
      { start: 0.06, duration: 0.24, frequency: 783.99, gain: 0.35, waveform: "triangle" },
    ],
    wrong: [
      { start: 0, duration: 0.12, frequency: 330, gain: 0.36, waveform: "square" },
      { start: 0.08, duration: 0.2, frequency: 220, gain: 0.3, waveform: "square" },
    ],
    points: [
      { start: 0, duration: 0.08, frequency: 900, gain: 0.32, waveform: "triangle" },
      { start: 0.06, duration: 0.12, frequency: 1250, gain: 0.28, waveform: "triangle" },
    ],
    rankUp: [
      { start: 0, duration: 0.14, frequency: 523.25, gain: 0.36, waveform: "triangle" },
      { start: 0.06, duration: 0.16, frequency: 659.25, gain: 0.36, waveform: "triangle" },
      { start: 0.12, duration: 0.24, frequency: 880, gain: 0.34, waveform: "triangle" },
    ],
    gallery: [
      { start: 0, duration: 0.18, frequency: 440, gain: 0.24, waveform: "sine" },
      { start: 0.08, duration: 0.2, frequency: 660, gain: 0.22, waveform: "sine" },
    ],
    photo: [
      { start: 0, duration: 0.03, frequency: 1200, gain: 0.35, waveform: "noise" },
      { start: 0.02, duration: 0.08, frequency: 500, gain: 0.28, waveform: "square" },
    ],
    upload: [
      { start: 0, duration: 0.1, frequency: 587.33, gain: 0.34, waveform: "triangle" },
      { start: 0.08, duration: 0.18, frequency: 783.99, gain: 0.34, waveform: "triangle" },
    ],
    celebration: [
      { start: 0, duration: 0.18, frequency: 392, gain: 0.26, waveform: "triangle" },
      { start: 0.08, duration: 0.18, frequency: 523.25, gain: 0.28, waveform: "triangle" },
      { start: 0.16, duration: 0.22, frequency: 659.25, gain: 0.3, waveform: "triangle" },
      { start: 0.26, duration: 0.28, frequency: 783.99, gain: 0.3, waveform: "triangle" },
      { start: 0.32, duration: 0.14, frequency: 1500, gain: 0.18, waveform: "noise" },
    ],
  };

  const tones = definitions[name];
  const totalDuration = Math.max(...tones.map((tone) => tone.start + tone.duration)) + 0.02;

  return new Howl({
    src: [toWavDataUri(tones, totalDuration)],
    volume: name === "celebration" ? 0.8 : 0.68,
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
