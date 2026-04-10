/**
 * Validates the sample level data file against LevelSystem's validation.
 */

import * as fs from 'fs';
import * as path from 'path';
import { LevelSystem } from '../../src/gameplay/LevelSystem';
import { LevelData } from '../../src/interfaces/GameInterfaces';

const LEVELS_PATH = path.resolve(__dirname, '../../assets/data/levels.json');

describe('Sample level data validation', () => {
    let levelData: LevelData[];
    let levelSystem: LevelSystem;

    beforeAll(() => {
        const raw = fs.readFileSync(LEVELS_PATH, 'utf-8');
        const json = JSON.parse(raw);

        // Flatten all levels from all worlds
        levelData = json.worlds.flatMap(
            (w: { levels: LevelData[] }) => w.levels
        );
        levelSystem = new LevelSystem();
    });

    test('level data file exists and is valid JSON', () => {
        expect(levelData.length).toBeGreaterThan(0);
    });

    test('all levels pass validation', () => {
        for (const level of levelData) {
            const result = LevelSystem.validateLevelData(level);
            expect(result.valid).toBe(true);
        }
    });

    test('all levels load successfully', () => {
        levelSystem.loadLevelData(levelData);
        const w1 = levelSystem.getLevelsByWorld(1);
        const w2 = levelSystem.getLevelsByWorld(2);
        expect(w1.length + w2.length).toBe(levelData.length);
    });

    test('all level IDs follow world-level format', () => {
        for (const level of levelData) {
            expect(level.id).toMatch(/^\d+-\d+$/);
        }
    });

    test('world 1 has 5 levels', () => {
        const world1 = levelData.filter(l => l.world === 1);
        expect(world1.length).toBe(5);
    });

    test('world 2 has 4 levels', () => {
        const world2 = levelData.filter(l => l.world === 2);
        expect(world2.length).toBe(4);
    });

    test('all light point positions are in normalized range [0, 1]', () => {
        for (const level of levelData) {
            for (const lp of level.lightPoints) {
                expect(lp.x).toBeGreaterThanOrEqual(0);
                expect(lp.x).toBeLessThanOrEqual(1);
                expect(lp.y).toBeGreaterThanOrEqual(0);
                expect(lp.y).toBeLessThanOrEqual(1);
            }
        }
    });

    test('all ball spawn positions are in normalized range', () => {
        for (const level of levelData) {
            expect(level.ball.spawn.x).toBeGreaterThanOrEqual(0);
            expect(level.ball.spawn.x).toBeLessThanOrEqual(1);
            expect(level.ball.spawn.y).toBeGreaterThanOrEqual(0);
            expect(level.ball.spawn.y).toBeLessThanOrEqual(1);
        }
    });

    test('star thresholds are strictly ascending', () => {
        for (const level of levelData) {
            const { one, two, three } = level.starThresholds;
            expect(one).toBeGreaterThan(0);
            expect(two).toBeGreaterThan(one);
            expect(three).toBeGreaterThanOrEqual(two);
        }
    });

    test('difficulty increases within each world', () => {
        for (let w = 1; w <= 2; w++) {
            const levels = levelData.filter(l => l.world === w).sort((a, b) => a.level - b.level);
            for (let i = 1; i < levels.length; i++) {
                expect(levels[i].difficulty).toBeGreaterThanOrEqual(levels[i - 1].difficulty);
            }
        }
    });

    test('maxLines is at least 3 for all levels', () => {
        for (const level of levelData) {
            expect(level.maxLines).toBeGreaterThanOrEqual(3);
        }
    });

    test('timeLimit is reasonable (20-120 seconds)', () => {
        for (const level of levelData) {
            expect(level.timeLimit).toBeGreaterThanOrEqual(20);
            expect(level.timeLimit).toBeLessThanOrEqual(120);
        }
    });

    test('each level has at least 3 light points', () => {
        for (const level of levelData) {
            expect(level.lightPoints.length).toBeGreaterThanOrEqual(3);
        }
    });
});
