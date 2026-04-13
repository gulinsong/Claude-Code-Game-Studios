#!/usr/bin/env node
/**
 * generate-audio-node.js
 *
 * Generates placeholder WAV audio files for 反弹达人 (Bounce Master).
 * Pure Node.js — no ffmpeg required.
 *
 * Usage: node tools/generate-audio-node.js
 * Output: assets/audio/sfx/*.wav + assets/audio/bgm/*.wav
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SFX_DIR = path.join(ROOT, 'assets', 'audio', 'sfx');
const BGM_DIR = path.join(ROOT, 'assets', 'audio', 'bgm');

fs.mkdirSync(SFX_DIR, { recursive: true });
fs.mkdirSync(BGM_DIR, { recursive: true });

const SAMPLE_RATE = 44100;

// ================================================================
// WAV generation utilities
// ================================================================

/** Generate a sine wave buffer. */
function sineWave(freq, duration, sampleRate = SAMPLE_RATE) {
    const numSamples = Math.ceil(sampleRate * duration);
    const buf = new Float64Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
        buf[i] = Math.sin(2 * Math.PI * freq * i / sampleRate);
    }
    return buf;
}

/** Generate a frequency sweep (ascending or descending). */
function sweep(startFreq, endFreq, duration, sampleRate = SAMPLE_RATE) {
    const numSamples = Math.ceil(sampleRate * duration);
    const buf = new Float64Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
        const t = i / numSamples;
        const freq = startFreq + (endFreq - startFreq) * t;
        buf[i] = Math.sin(2 * Math.PI * freq * i / sampleRate);
    }
    return buf;
}

/** Mix multiple buffers together. */
function mixBuffers(...buffers) {
    const maxLen = Math.max(...buffers.map(b => b.length));
    const result = new Float64Array(maxLen);
    for (const buf of buffers) {
        for (let i = 0; i < buf.length; i++) {
            result[i] += buf[i];
        }
    }
    return result;
}

/** Concatenate buffers sequentially. */
function concatBuffers(...buffers) {
    const totalLen = buffers.reduce((sum, b) => sum + b.length, 0);
    const result = new Float64Array(totalLen);
    let offset = 0;
    for (const buf of buffers) {
        result.set(buf, offset);
        offset += buf.length;
    }
    return result;
}

/** Apply linear fade in. */
function fadeIn(buf, durationSec, sampleRate = SAMPLE_RATE) {
    const fadeSamples = Math.min(Math.ceil(durationSec * sampleRate), buf.length);
    const result = new Float64Array(buf);
    for (let i = 0; i < fadeSamples; i++) {
        result[i] *= i / fadeSamples;
    }
    return result;
}

/** Apply linear fade out. */
function fadeOut(buf, durationSec, sampleRate = SAMPLE_RATE) {
    const fadeSamples = Math.min(Math.ceil(durationSec * sampleRate), buf.length);
    const result = new Float64Array(buf);
    for (let i = 0; i < fadeSamples; i++) {
        result[result.length - 1 - i] *= i / fadeSamples;
    }
    return result;
}

/** Apply exponential decay envelope. */
function decayEnvelope(buf, decayRate = 5) {
    const result = new Float64Array(buf);
    for (let i = 0; i < buf.length; i++) {
        const t = i / buf.length;
        result[i] *= Math.exp(-decayRate * t);
    }
    return result;
}

/** Apply volume scaling. */
function volume(buf, vol) {
    const result = new Float64Array(buf);
    for (let i = 0; i < buf.length; i++) {
        result[i] *= vol;
    }
    return result;
}

/** Convert float buffer to 16-bit PCM WAV file bytes. */
function toWavBytes(samples, numChannels = 1, sampleRate = SAMPLE_RATE) {
    const numSamples = samples.length;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const bufferSize = 44 + dataSize;

    const buffer = Buffer.alloc(bufferSize);
    let offset = 0;

    // RIFF header
    buffer.write('RIFF', offset); offset += 4;
    buffer.writeUInt32LE(bufferSize - 8, offset); offset += 4;
    buffer.write('WAVE', offset); offset += 4;

    // fmt chunk
    buffer.write('fmt ', offset); offset += 4;
    buffer.writeUInt32LE(16, offset); offset += 4;          // chunk size
    buffer.writeUInt16LE(1, offset); offset += 2;            // PCM format
    buffer.writeUInt16LE(numChannels, offset); offset += 2;
    buffer.writeUInt32LE(sampleRate, offset); offset += 4;
    buffer.writeUInt32LE(byteRate, offset); offset += 4;
    buffer.writeUInt16LE(blockAlign, offset); offset += 2;
    buffer.writeUInt16LE(16, offset); offset += 2;          // bits per sample

    // data chunk
    buffer.write('data', offset); offset += 4;
    buffer.writeUInt32LE(dataSize, offset); offset += 4;

    // Write PCM samples
    for (let i = 0; i < numSamples; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
        buffer.writeInt16LE(val, offset);
        offset += 2;
    }

    return buffer;
}

/** Write a WAV file. */
function writeWav(filePath, samples, numChannels = 1) {
    const wavBytes = toWavBytes(samples, numChannels);
    fs.writeFileSync(filePath, wavBytes);
    const sizeKB = (wavBytes.length / 1024).toFixed(1);
    console.log(`  ${path.basename(filePath)} — ${sizeKB} KB`);
}

// ================================================================
// Sound generation functions
// ================================================================

function makeBounce() {
    // Crisp short pluck: high freq with fast decay
    const tone = sineWave(1000, 0.2);
    const harmonic = volume(sineWave(2000, 0.15), 0.3);
    let buf = mixBuffers(tone, harmonic);
    buf = decayEnvelope(buf, 8);
    buf = fadeIn(buf, 0.003);
    return volume(buf, 0.8);
}

function makeCollect() {
    // Rising sparkle: ascending sweep with shimmer
    const base = sweep(600, 1200, 0.35);
    const shimmer = volume(sweep(1200, 2400, 0.3), 0.3);
    let buf = mixBuffers(base, shimmer);
    buf = decayEnvelope(buf, 4);
    buf = fadeIn(buf, 0.01);
    return volume(buf, 0.7);
}

function makeWin() {
    // Major chord arpeggio: C5-E5-G5-C6
    const noteDur = 0.25;
    const gap = 0.12;
    const c5 = volume(decayEnvelope(sineWave(523.25, noteDur + gap * 3), 3), 0.7);
    const e5 = volume(decayEnvelope(sineWave(659.25, noteDur + gap * 2), 3), 0.6);
    const g5 = volume(decayEnvelope(sineWave(783.99, noteDur + gap), 3), 0.5);
    const c6 = volume(decayEnvelope(sineWave(1046.5, noteDur), 3), 0.4);

    // Offset each note
    const totalDur = 1.2;
    const totalSamples = Math.ceil(SAMPLE_RATE * totalDur);
    const result = new Float64Array(totalSamples);

    let offset = 0;
    for (const note of [c5, e5, g5, c6]) {
        const startSample = Math.floor(offset * SAMPLE_RATE);
        for (let i = 0; i < note.length && startSample + i < totalSamples; i++) {
            result[startSample + i] += note[i];
        }
        offset += gap;
    }
    return volume(fadeOut(result, 0.3), 0.9);
}

function makeLose() {
    // Gentle descending tone
    let buf = sweep(400, 200, 0.5);
    const sub = volume(sineWave(100, 0.4), 0.2);
    buf = mixBuffers(buf, sub);
    buf = decayEnvelope(buf, 3);
    buf = fadeIn(buf, 0.005);
    return volume(buf, 0.6);
}

function makeLinePlace() {
    // Short satisfying snap
    let buf = sineWave(500, 0.1);
    const click = volume(sineWave(2000, 0.02), 0.4);
    buf = concatBuffers(click, buf);
    buf = decayEnvelope(buf, 12);
    return volume(buf, 0.5);
}

function makeLineReject() {
    // Soft buzzy error
    const tone = sineWave(250, 0.1);
    const buzz = volume(sineWave(253, 0.1), 0.7); // slight detune for buzz
    let buf = mixBuffers(tone, buzz);
    buf = decayEnvelope(buf, 10);
    return volume(buf, 0.4);
}

function makeButtonClick() {
    let buf = sineWave(1000, 0.06);
    buf = decayEnvelope(buf, 15);
    buf = fadeIn(buf, 0.002);
    return volume(buf, 0.4);
}

function makeLevelSelect() {
    let buf = sweep(800, 1000, 0.12);
    buf = decayEnvelope(buf, 8);
    buf = fadeIn(buf, 0.003);
    return volume(buf, 0.5);
}

function makeWorldUnlock() {
    const base = sweep(500, 1500, 0.4);
    const shimmer = volume(sweep(1000, 3000, 0.3), 0.2);
    let buf = mixBuffers(base, shimmer);
    buf = decayEnvelope(buf, 3);
    buf = fadeIn(buf, 0.01);
    return volume(buf, 0.7);
}

function makePauseOpen() {
    let buf = sweep(600, 400, 0.08);
    buf = decayEnvelope(buf, 8);
    return volume(buf, 0.3);
}

function makePauseClose() {
    let buf = sweep(400, 600, 0.08);
    buf = decayEnvelope(buf, 8);
    return volume(buf, 0.3);
}

function makeResultAppear() {
    // Short whoosh
    const noise = new Float64Array(Math.ceil(SAMPLE_RATE * 0.12));
    for (let i = 0; i < noise.length; i++) {
        noise[i] = (Math.random() * 2 - 1);
    }
    let buf = volume(noise, 0.3);
    const tone = volume(sweep(300, 800, 0.1), 0.4);
    buf = mixBuffers(buf, tone);
    buf = decayEnvelope(buf, 6);
    buf = fadeIn(buf, 0.005);
    return volume(buf, 0.5);
}

function makeMenuMusic() {
    // Simple ambient C major pad — layered sine tones
    const dur = 15; // 15s loop
    const c4 = volume(sineWave(261.63, dur), 0.12);
    const e4 = volume(sineWave(329.63, dur), 0.10);
    const g4 = volume(sineWave(392.00, dur), 0.08);
    const c5 = volume(sineWave(523.25, dur), 0.06);
    let buf = mixBuffers(c4, e4, g4, c5);
    // Add slow LFO tremolo
    for (let i = 0; i < buf.length; i++) {
        const lfo = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.5 * i / SAMPLE_RATE);
        buf[i] *= lfo;
    }
    buf = fadeIn(buf, 0.5);
    buf = fadeOut(buf, 0.5);
    return volume(buf, 0.6);
}

function makeGameplayMusic() {
    // Lighter, more rhythmic pad — F major
    const dur = 15;
    const f4 = volume(sineWave(349.23, dur), 0.10);
    const a4 = volume(sineWave(440.00, dur), 0.08);
    const c5 = volume(sineWave(523.25, dur), 0.07);
    let buf = mixBuffers(f4, a4, c5);
    // Add rhythmic pulse (2 Hz)
    for (let i = 0; i < buf.length; i++) {
        const pulse = 0.7 + 0.3 * Math.sin(2 * Math.PI * 2 * i / SAMPLE_RATE);
        buf[i] *= pulse;
    }
    buf = fadeIn(buf, 0.5);
    buf = fadeOut(buf, 0.5);
    return volume(buf, 0.5);
}

// ================================================================
// Generate all audio files
// ================================================================

console.log('=== 反弹达人 Placeholder Audio Generator (Node.js) ===\n');

const sfxGenerators = [
    ['bounce',        makeBounce],
    ['collect',       makeCollect],
    ['win',           makeWin],
    ['lose',          makeLose],
    ['line_place',    makeLinePlace],
    ['line_reject',   makeLineReject],
    ['button_click',  makeButtonClick],
    ['level_select',  makeLevelSelect],
    ['world_unlock',  makeWorldUnlock],
    ['pause_open',    makePauseOpen],
    ['pause_close',   makePauseClose],
    ['result_appear', makeResultAppear],
];

console.log('--- Sound Effects (SFX) ---');
let sfxCount = 0;
for (const [name, genFn] of sfxGenerators) {
    const samples = genFn();
    const filePath = path.join(SFX_DIR, `${name}.wav`);
    writeWav(filePath, samples);
    sfxCount++;
}

console.log('\n--- Background Music (BGM) ---');
let bgmCount = 0;

const menuSamples = makeMenuMusic();
writeWav(path.join(BGM_DIR, 'menu_music.wav'), menuSamples);
bgmCount++;

const gameplaySamples = makeGameplayMusic();
writeWav(path.join(BGM_DIR, 'gameplay_music.wav'), gameplaySamples);
bgmCount++;

console.log(`\n=== Done: ${sfxCount} SFX + ${bgmCount} BGM generated ===`);
console.log('Format: 16-bit PCM WAV, 44100 Hz, Mono');
console.log('Note: Convert to MP3 with ffmpeg before production use.');
