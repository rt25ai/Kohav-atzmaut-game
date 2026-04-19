import assert from "node:assert/strict";

import {
  renderSoundWavBytes,
  soundBlueprints,
  type SoundName,
} from "../src/lib/sound/generated-sfx";

function readPcmSamples(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const pcm = [];

  for (let offset = 44; offset < bytes.length; offset += 2) {
    pcm.push(view.getInt16(offset, true));
  }

  return pcm;
}

function verifySound(name: SoundName) {
  const bytes = renderSoundWavBytes(name);
  const samples = readPcmSamples(bytes);
  const nonZeroSamples = samples.filter((sample) => sample !== 0);
  const peak = nonZeroSamples.reduce(
    (currentMax, sample) => Math.max(currentMax, Math.abs(sample)),
    0,
  );

  assert.ok(bytes.length > 100, `${name} should render a non-empty WAV payload`);
  assert.ok(samples.length > 100, `${name} should render PCM samples`);
  assert.ok(
    nonZeroSamples.length > samples.length * 0.12,
    `${name} should contain audible non-zero PCM samples`,
  );
  assert.ok(peak > 3_000, `${name} should contain an audible peak amplitude`);
}

assert.ok(soundBlueprints.click.tones.length >= 3, "click should use layered premium tones");
assert.ok(
  soundBlueprints.transition.tones.length >= 3,
  "transition should use layered premium tones",
);
assert.ok(
  soundBlueprints.celebration.tones.length >= 4,
  "celebration should use a richer layered flourish",
);
assert.ok(
  soundBlueprints.photo.tones.some((tone) => tone.waveform === "noise"),
  "photo should include a soft organic shutter accent",
);

for (const soundName of ["click", "start", "transition", "upload", "celebration"] satisfies SoundName[]) {
  assert.ok(
    soundBlueprints[soundName].tones.every((tone) => tone.waveform !== "square"),
    `${soundName} should avoid harsh square-wave layers`,
  );
}

for (const soundName of [
  "start",
  "click",
  "transition",
  "gallery",
  "upload",
  "celebration",
] satisfies SoundName[]) {
  verifySound(soundName);
}

console.log("verify-generated-sfx: PASS");
