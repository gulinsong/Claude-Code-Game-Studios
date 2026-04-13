#!/usr/bin/env node
/**
 * generate-placeholder-audio.js
 *
 * Generates placeholder audio files for 反弹达人 (Bounce Master).
 * Uses ffmpeg to create simple sine-wave tones matching the AUDIO-SPEC.md.
 *
 * Prerequisites: ffmpeg must be installed and on PATH.
 *
 * Usage:
 *   node tools/generate-placeholder-audio.js
 *
 * Output:
 *   assets/audio/sfx/*.mp3  — 12 SFX placeholders
 *   assets/audio/bgm/*.mp3  — 2 BGM placeholders (short loops)
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const SFX_DIR = path.join(ROOT, 'assets', 'audio', 'sfx');
const BGM_DIR = path.join(ROOT, 'assets', 'audio', 'bgm');

// Ensure output directories exist
fs.mkdirSync(SFX_DIR, { recursive: true });
fs.mkdirSync(BGM_DIR, { recursive: true });

/** Check if ffmpeg is available */
function checkFfmpeg() {
    try {
        execSync('ffmpeg -version', { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

/** Generate a sine tone MP3 using ffmpeg */
function generateSfx(name, frequency, duration, volume = 0.5, extraArgs = '') {
    const outputPath = path.join(SFX_DIR, `${name}.mp3`);
    const cmd = `ffmpeg -y -f lavfi -i "sine=frequency=${frequency}:duration=${duration}" ` +
        `-af "volume=${volume}${extraArgs}" ` +
        `-b:a 128k -ar 44100 -ac 1 ` +
        `"${outputPath}"`;

    console.log(`  Generating: ${name}.mp3 (${frequency}Hz, ${duration}s)`);
    try {
        execSync(cmd, { stdio: 'pipe' });
        return true;
    } catch (e) {
        console.error(`  FAILED: ${name} — ${e.message}`);
        return false;
    }
}

/** Generate a BGM placeholder using ffmpeg (white noise filtered to be musical) */
function generateBgm(name, duration, tempo, extraFilter = '') {
    const outputPath = path.join(BGM_DIR, `${name}.mp3`);
    // Generate a simple ambient tone using sine oscillators
    const cmd = `ffmpeg -y -f lavfi -i "sine=frequency=261.63:duration=${duration}" ` +
        `-f lavfi -i "sine=frequency=329.63:duration=${duration}" ` +
        `-f lavfi -i "sine=frequency=392.00:duration=${duration}" ` +
        `-filter_complex "` +
        `[0:a]volume=0.15[a0];` +
        `[1:a]volume=0.1[a1];` +
        `[2:a]volume=0.08[a2];` +
        `[a0][a1][a2]amix=inputs=3:duration=longest,` +
        `volume=0.3${extraFilter}` +
        `" ` +
        `-b:a 128k -ar 44100 -ac 2 ` +
        `"${outputPath}"`;

    console.log(`  Generating: ${name}.mp3 (${duration}s ambient chord)`);
    try {
        execSync(cmd, { stdio: 'pipe' });
        return true;
    } catch (e) {
        console.error(`  FAILED: ${name} — ${e.message}`);
        return false;
    }
}

// ================================================================
// Main
// ================================================================

console.log('=== 反弹达人 Placeholder Audio Generator ===\n');

if (!checkFfmpeg()) {
    console.error('ERROR: ffmpeg not found. Install it first:');
    console.error('  Ubuntu/Debian: sudo apt install ffmpeg');
    console.error('  macOS: brew install ffmpeg');
    console.error('  Windows: choco install ffmpeg');
    process.exit(1);
}

let sfxCount = 0;
let bgmCount = 0;

console.log('--- Sound Effects (SFX) ---');

// Core gameplay SFX
if (generateSfx('bounce', 1000, 0.2, 0.8, ',afade=t:in:0=0:0.005,afade=t:out:0=0.15')) sfxCount++;
if (generateSfx('collect', 800, 0.4, 0.7, ',asweep=f=600:t=1200:d=0.3')) sfxCount++;
if (generateSfx('win', 784, 1.2, 0.9)) sfxCount++;
if (generateSfx('lose', 300, 0.6, 0.6, ',asweep=f=400:t=200:d=0.5')) sfxCount++;
if (generateSfx('line_place', 500, 0.12, 0.5)) sfxCount++;
if (generateSfx('line_reject', 250, 0.12, 0.4)) sfxCount++;

// UI SFX
if (generateSfx('button_click', 1000, 0.08, 0.4)) sfxCount++;
if (generateSfx('level_select', 900, 0.15, 0.5, ',asweep=f=800:t=1000:d=0.1')) sfxCount++;
if (generateSfx('world_unlock', 1000, 0.5, 0.7, ',asweep=f=500:t=1500:d=0.4')) sfxCount++;
if (generateSfx('pause_open', 500, 0.1, 0.3, ',asweep=f=600:t=400:d=0.08')) sfxCount++;
if (generateSfx('pause_close', 500, 0.1, 0.3, ',asweep=f=400:t=600:d=0.08')) sfxCount++;
if (generateSfx('result_appear', 600, 0.15, 0.5)) sfxCount++;

console.log('\n--- Background Music (BGM) ---');

if (generateBgm('menu_music', 30, 100)) bgmCount++;
if (generateBgm('gameplay_music', 30, 110, ',lowpass=f=2000')) bgmCount++;

console.log(`\n=== Done: ${sfxCount} SFX + ${bgmCount} BGM generated ===`);
console.log('Output directories:');
console.log(`  ${SFX_DIR}`);
console.log(`  ${BGM_DIR}`);
