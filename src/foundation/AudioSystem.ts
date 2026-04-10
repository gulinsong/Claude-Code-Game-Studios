/**
 * AudioSystem.ts — Pure-logic audio management system.
 *
 * Manages sound types, volume calculation, and playback requests.
 * The actual audio rendering is delegated to the engine layer via callbacks.
 *
 * GDD: design/gdd/audio-system.md
 * No engine dependencies — pure TypeScript.
 */

import { AUDIO_CONFIG } from '../config/GameConfig';

/** Sound effect identifiers matching GDD definitions. */
export enum SoundType {
    BOUNCE = 'bounce',
    COLLECT = 'collect',
    WIN = 'win',
    LOSE = 'lose',
    LINE_PLACE = 'line_place',
    LINE_UNDO = 'line_undo',
}

/** Music identifiers. */
export enum MusicType {
    MENU = 'menu_music',
    GAMEPLAY = 'gameplay_music',
}

/** Audio channel types for volume control. */
export enum AudioChannel {
    MASTER = 'master',
    SFX = 'sfx',
    BGM = 'bgm',
}

/**
 * AudioSystem provides volume calculations and playback request dispatch.
 * The engine integration layer handles actual audio file loading and playback.
 */
export class AudioSystem {
    private masterVolume: number;
    private sfxVolume: number;
    private bgmVolume: number;
    private maxConcurrent: number;
    private activeCount: number;
    private muted: boolean;

    /** Callback: engine layer should play a sound effect. */
    public onPlaySound: ((soundId: string, volume: number) => void) | null;

    /** Callback: engine layer should play/switch background music. */
    public onPlayMusic: ((musicId: string, volume: number) => void) | null;

    /** Callback: engine layer should stop background music. */
    public onStopMusic: (() => void) | null;

    constructor() {
        this.masterVolume = AUDIO_CONFIG.MASTER_VOLUME;
        this.sfxVolume = AUDIO_CONFIG.SFX_VOLUME;
        this.bgmVolume = AUDIO_CONFIG.BGM_VOLUME;
        this.maxConcurrent = AUDIO_CONFIG.MAX_CONCURRENT_SOUNDS;
        this.activeCount = 0;
        this.muted = false;
        this.onPlaySound = null;
        this.onPlayMusic = null;
        this.onStopMusic = null;
    }

    // ===== Sound playback =====

    /**
     * Request playback of a sound effect.
     *
     * Applies volume calculation (master * sfx) and enforces concurrency limit.
     *
     * @param soundId - The sound to play.
     * @param baseVolume - Per-sound volume (0-1), defaults to 1.0.
     */
    playSound(soundId: SoundType, baseVolume: number = 1.0): void {
        if (this.muted) return;
        if (this.activeCount >= this.maxConcurrent) return;

        const volume = this.calculateVolume(AudioChannel.SFX, baseVolume);
        if (volume <= 0) return;

        this.activeCount++;
        if (this.onPlaySound) {
            this.onPlaySound(soundId, volume);
        }
    }

    /**
     * Start or switch background music.
     *
     * @param musicId - The music track to play.
     */
    playMusic(musicId: MusicType): void {
        if (this.muted) return;

        const volume = this.calculateVolume(AudioChannel.BGM);
        if (this.onPlayMusic) {
            this.onPlayMusic(musicId, volume);
        }
    }

    /** Stop background music. */
    stopMusic(): void {
        if (this.onStopMusic) {
            this.onStopMusic();
        }
    }

    /** Notify the system that a sound effect has finished playing. */
    onSoundFinished(): void {
        this.activeCount = Math.max(0, this.activeCount - 1);
    }

    // ===== Volume control =====

    /**
     * Calculate effective volume for a channel.
     *
     * Formula: masterVolume * channelVolume * baseVolume
     */
    calculateVolume(channel: AudioChannel, baseVolume: number = 1.0): number {
        const channelVolume = channel === AudioChannel.BGM ? this.bgmVolume : this.sfxVolume;
        return this.masterVolume * channelVolume * baseVolume;
    }

    /** Set volume for a specific channel (0.0 - 1.0). */
    setVolume(channel: AudioChannel, value: number): void {
        const clamped = Math.max(0, Math.min(1, value));
        switch (channel) {
            case AudioChannel.MASTER:
                this.masterVolume = clamped;
                break;
            case AudioChannel.SFX:
                this.sfxVolume = clamped;
                break;
            case AudioChannel.BGM:
                this.bgmVolume = clamped;
                break;
        }
    }

    /** Get volume for a specific channel. */
    getVolume(channel: AudioChannel): number {
        switch (channel) {
            case AudioChannel.MASTER: return this.masterVolume;
            case AudioChannel.SFX: return this.sfxVolume;
            case AudioChannel.BGM: return this.bgmVolume;
        }
    }

    /** Toggle mute state. */
    setMuted(muted: boolean): void {
        this.muted = muted;
        if (muted) {
            this.stopMusic();
        }
    }

    /** Check if muted. */
    isMuted(): boolean {
        return this.muted;
    }

    // ===== Queries =====

    /** Get current active sound count. */
    getActiveCount(): number {
        return this.activeCount;
    }
}
