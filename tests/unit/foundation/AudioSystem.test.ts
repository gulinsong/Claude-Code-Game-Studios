/**
 * AudioSystem.test.ts — Unit tests for AudioSystem.
 * GDD: design/gdd/audio-system.md
 */

import {
    AudioSystem,
    SoundType,
    MusicType,
    AudioChannel,
} from '../../../src/foundation/AudioSystem';

describe('AudioSystem volume calculation', () => {
    test('default volumes: master=1.0, sfx=1.0, bgm=0.7', () => {
        const audio = new AudioSystem();
        expect(audio.getVolume(AudioChannel.MASTER)).toBe(1.0);
        expect(audio.getVolume(AudioChannel.SFX)).toBe(1.0);
        expect(audio.getVolume(AudioChannel.BGM)).toBe(0.7);
    });

    test('SFX volume = master * sfx * base', () => {
        const audio = new AudioSystem();
        expect(audio.calculateVolume(AudioChannel.SFX, 1.0)).toBeCloseTo(1.0);
        expect(audio.calculateVolume(AudioChannel.SFX, 0.5)).toBeCloseTo(0.5);
    });

    test('BGM volume = master * bgm * base', () => {
        const audio = new AudioSystem();
        expect(audio.calculateVolume(AudioChannel.BGM)).toBeCloseTo(0.7);
    });

    test('master volume affects all channels', () => {
        const audio = new AudioSystem();
        audio.setVolume(AudioChannel.MASTER, 0.5);
        expect(audio.calculateVolume(AudioChannel.SFX)).toBeCloseTo(0.5);
        expect(audio.calculateVolume(AudioChannel.BGM)).toBeCloseTo(0.35);
    });

    test('volume is clamped to [0, 1]', () => {
        const audio = new AudioSystem();
        audio.setVolume(AudioChannel.SFX, -0.5);
        expect(audio.getVolume(AudioChannel.SFX)).toBe(0);
        audio.setVolume(AudioChannel.SFX, 2.0);
        expect(audio.getVolume(AudioChannel.SFX)).toBe(1.0);
    });
});

describe('AudioSystem sound playback', () => {
    let audio: AudioSystem;
    let playedSounds: { id: string; volume: number }[];

    beforeEach(() => {
        audio = new AudioSystem();
        playedSounds = [];
        audio.onPlaySound = (id, volume) => playedSounds.push({ id, volume });
    });

    test('playSound triggers callback with correct id and volume', () => {
        audio.playSound(SoundType.BOUNCE);
        expect(playedSounds.length).toBe(1);
        expect(playedSounds[0].id).toBe('bounce');
        expect(playedSounds[0].volume).toBeCloseTo(1.0);
    });

    test('playSound respects base volume', () => {
        audio.playSound(SoundType.COLLECT, 0.5);
        expect(playedSounds[0].volume).toBeCloseTo(0.5);
    });

    test('playSound does not play when muted', () => {
        audio.setMuted(true);
        audio.playSound(SoundType.BOUNCE);
        expect(playedSounds.length).toBe(0);
    });

    test('playSound tracks active count', () => {
        audio.playSound(SoundType.BOUNCE);
        expect(audio.getActiveCount()).toBe(1);
        audio.playSound(SoundType.COLLECT);
        expect(audio.getActiveCount()).toBe(2);
    });

    test('onSoundFinished decrements active count', () => {
        audio.playSound(SoundType.BOUNCE);
        audio.onSoundFinished();
        expect(audio.getActiveCount()).toBe(0);
    });

    test('concurrent limit blocks excess sounds', () => {
        // MAX_CONCURRENT_SOUNDS = 8
        for (let i = 0; i < 10; i++) {
            audio.playSound(SoundType.BOUNCE);
        }
        expect(playedSounds.length).toBe(8);
    });

    test('playSound with 0 effective volume does not play', () => {
        audio.setVolume(AudioChannel.MASTER, 0);
        audio.playSound(SoundType.BOUNCE);
        expect(playedSounds.length).toBe(0);
    });

    test('no callback does not throw', () => {
        const noCb = new AudioSystem();
        expect(() => noCb.playSound(SoundType.WIN)).not.toThrow();
    });
});

describe('AudioSystem music', () => {
    let audio: AudioSystem;
    let playedMusic: { id: string; volume: number }[];
    let stopCount: number;

    beforeEach(() => {
        audio = new AudioSystem();
        playedMusic = [];
        stopCount = 0;
        audio.onPlayMusic = (id, volume) => playedMusic.push({ id, volume });
        audio.onStopMusic = () => stopCount++;
    });

    test('playMusic triggers callback', () => {
        audio.playMusic(MusicType.MENU);
        expect(playedMusic.length).toBe(1);
        expect(playedMusic[0].id).toBe('menu_music');
    });

    test('playMusic uses BGM volume', () => {
        audio.playMusic(MusicType.GAMEPLAY);
        expect(playedMusic[0].volume).toBeCloseTo(0.7);
    });

    test('playMusic blocked when muted', () => {
        audio.setMuted(true);
        audio.playMusic(MusicType.MENU);
        expect(playedMusic.length).toBe(0);
    });

    test('stopMusic triggers callback', () => {
        audio.stopMusic();
        expect(stopCount).toBe(1);
    });

    test('muting stops music', () => {
        audio.setMuted(true);
        expect(stopCount).toBe(1);
    });
});

describe('AudioSystem mute toggle', () => {
    test('isMuted reflects state', () => {
        const audio = new AudioSystem();
        expect(audio.isMuted()).toBe(false);
        audio.setMuted(true);
        expect(audio.isMuted()).toBe(true);
        audio.setMuted(false);
        expect(audio.isMuted()).toBe(false);
    });
});

describe('AudioSystem all sound types', () => {
    test('all 6 sound types can be played', () => {
        const played: string[] = [];
        const audio = new AudioSystem();
        audio.onPlaySound = (id) => played.push(id);

        audio.playSound(SoundType.BOUNCE);
        audio.onSoundFinished();
        audio.playSound(SoundType.COLLECT);
        audio.onSoundFinished();
        audio.playSound(SoundType.WIN);
        audio.onSoundFinished();
        audio.playSound(SoundType.LOSE);
        audio.onSoundFinished();
        audio.playSound(SoundType.LINE_PLACE);
        audio.onSoundFinished();
        audio.playSound(SoundType.LINE_UNDO);

        expect(played).toEqual(['bounce', 'collect', 'win', 'lose', 'line_place', 'line_undo']);
    });
});
