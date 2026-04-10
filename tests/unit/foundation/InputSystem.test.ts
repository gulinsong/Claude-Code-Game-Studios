/**
 * InputSystem.test.ts — Unit tests for InputSystem.
 * GDD: design/gdd/input-system.md
 *
 * Covers: touch lifecycle (start/move/end), state transitions,
 * minimum line length validation, pause/cancel behavior,
 * canDraw control, preview line data.
 */

import { InputSystem, TouchData } from '../../../src/foundation/InputSystem';
import { InputPhase } from '../../../src/interfaces/GameInterfaces';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function touch(id: number, x: number, y: number): TouchData {
    return { id, x, y };
}

describe('InputSystem initial state', () => {
    test('starts in IDLE phase', () => {
        const input = new InputSystem();
        expect(input.getPhase()).toBe(InputPhase.IDLE);
        expect(input.isDrawing()).toBe(false);
    });

    test('getPreviewLine returns null initially', () => {
        const input = new InputSystem();
        expect(input.getPreviewLine()).toBeNull();
    });
});

describe('InputSystem touch lifecycle', () => {
    let input: InputSystem;
    let confirmedLines: { start: { x: number; y: number }; end: { x: number; y: number } }[];
    let rejectedCount: number;
    let previewCount: number;
    let hideCount: number;

    beforeEach(() => {
        input = new InputSystem(20);
        confirmedLines = [];
        rejectedCount = 0;
        previewCount = 0;
        hideCount = 0;
        input.onLineConfirmed = (s, e) => confirmedLines.push({ start: s, end: e });
        input.onLineRejected = () => rejectedCount++;
        input.onPreviewUpdate = () => previewCount++;
        input.onPreviewHide = () => hideCount++;
    });

    test('touch start → DRAWING phase', () => {
        input.onTouchStart(touch(0, 100, 200));
        expect(input.getPhase()).toBe(InputPhase.DRAWING);
        expect(input.isDrawing()).toBe(true);
    });

    test('touch move updates preview', () => {
        input.onTouchStart(touch(0, 100, 200));
        input.onTouchMove(touch(0, 200, 300));
        expect(previewCount).toBe(1);
        const preview = input.getPreviewLine();
        expect(preview).not.toBeNull();
        expect(preview!.start.x).toBe(100);
        expect(preview!.end.x).toBe(200);
    });

    test('touch end with valid length confirms line', () => {
        input.onTouchStart(touch(0, 100, 200));
        input.onTouchMove(touch(0, 200, 200));
        input.onTouchEnd(touch(0, 200, 200));
        // Length = 100px > 20px → valid
        expect(confirmedLines.length).toBe(1);
        expect(confirmedLines[0].start.x).toBe(100);
        expect(confirmedLines[0].end.x).toBe(200);
        expect(input.getPhase()).toBe(InputPhase.IDLE);
    });

    test('touch end hides preview', () => {
        input.onTouchStart(touch(0, 100, 200));
        input.onTouchMove(touch(0, 200, 200));
        input.onTouchEnd(touch(0, 200, 200));
        expect(hideCount).toBe(1);
    });

    test('touch end with short line rejects', () => {
        input.onTouchStart(touch(0, 100, 200));
        input.onTouchMove(touch(0, 110, 200));
        input.onTouchEnd(touch(0, 110, 200));
        // Length = 10px < 20px → rejected
        expect(confirmedLines.length).toBe(0);
        expect(rejectedCount).toBe(1);
    });

    test('touch end with exact minimum length confirms', () => {
        input.onTouchStart(touch(0, 0, 0));
        input.onTouchEnd(touch(0, 20, 0));
        expect(confirmedLines.length).toBe(1);
    });

    test('touch end with length just below minimum rejects', () => {
        input.onTouchStart(touch(0, 0, 0));
        input.onTouchEnd(touch(0, 19.99, 0));
        expect(rejectedCount).toBe(1);
    });

    test('touch move without start is ignored', () => {
        input.onTouchMove(touch(0, 200, 300));
        expect(previewCount).toBe(0);
    });

    test('touch end without start is ignored', () => {
        input.onTouchEnd(touch(0, 200, 300));
        expect(confirmedLines.length).toBe(0);
    });

    test('second touch start during drawing is ignored', () => {
        input.onTouchStart(touch(0, 100, 200));
        input.onTouchStart(touch(1, 200, 300)); // ignored
        expect(input.getPhase()).toBe(InputPhase.DRAWING);
    });
});

describe('InputSystem touch cancel', () => {
    let input: InputSystem;
    let hideCount: number;
    let confirmedLines: { start: { x: number; y: number }; end: { x: number; y: number } }[];

    beforeEach(() => {
        input = new InputSystem(20);
        hideCount = 0;
        confirmedLines = [];
        input.onPreviewHide = () => hideCount++;
        input.onLineConfirmed = (s, e) => confirmedLines.push({ start: s, end: e });
    });

    test('cancel during drawing resets to idle without confirming', () => {
        input.onTouchStart(touch(0, 100, 200));
        input.onTouchMove(touch(0, 300, 400));
        input.onTouchCancel();
        expect(input.getPhase()).toBe(InputPhase.IDLE);
        expect(confirmedLines.length).toBe(0);
        expect(hideCount).toBe(1);
    });

    test('cancel in idle state is a no-op', () => {
        input.onTouchCancel();
        expect(input.getPhase()).toBe(InputPhase.IDLE);
    });
});

describe('InputSystem canDraw control', () => {
    let input: InputSystem;
    let confirmedLines: { start: { x: number; y: number }; end: { x: number; y: number } }[];

    beforeEach(() => {
        input = new InputSystem(20);
        confirmedLines = [];
        input.onLineConfirmed = (s, e) => confirmedLines.push({ start: s, end: e });
    });

    test('drawing blocked when canDraw is false', () => {
        input.setCanDraw(false);
        input.onTouchStart(touch(0, 100, 200));
        expect(input.getPhase()).toBe(InputPhase.IDLE);
    });

    test('drawing allowed when canDraw is true', () => {
        input.setCanDraw(true);
        input.onTouchStart(touch(0, 100, 200));
        expect(input.getPhase()).toBe(InputPhase.DRAWING);
    });

    test('canDraw defaults to true', () => {
        const fresh = new InputSystem();
        fresh.onTouchStart(touch(0, 100, 200));
        expect(fresh.getPhase()).toBe(InputPhase.DRAWING);
    });
});

describe('InputSystem pause behavior', () => {
    let input: InputSystem;
    let confirmedLines: { start: { x: number; y: number }; end: { x: number; y: number } }[];
    let hideCount: number;

    beforeEach(() => {
        input = new InputSystem(20);
        confirmedLines = [];
        hideCount = 0;
        input.onLineConfirmed = (s, e) => confirmedLines.push({ start: s, end: e });
        input.onPreviewHide = () => hideCount++;
    });

    test('touch start blocked during pause', () => {
        input.setPaused(true);
        input.onTouchStart(touch(0, 100, 200));
        expect(input.getPhase()).toBe(InputPhase.IDLE);
    });

    test('pause during drawing cancels in-progress line', () => {
        input.onTouchStart(touch(0, 100, 200));
        input.onTouchMove(touch(0, 300, 400));
        input.setPaused(true);
        expect(input.getPhase()).toBe(InputPhase.IDLE);
        expect(hideCount).toBe(1);
    });

    test('resume allows drawing again', () => {
        input.setPaused(true);
        input.setPaused(false);
        input.onTouchStart(touch(0, 100, 200));
        expect(input.getPhase()).toBe(InputPhase.DRAWING);
    });
});

describe('InputSystem preview line', () => {
    test('preview line returns correct data', () => {
        const input = new InputSystem();
        input.onTouchStart(touch(0, 50, 100));
        input.onTouchMove(touch(0, 150, 200));

        const preview = input.getPreviewLine();
        expect(preview).not.toBeNull();
        expect(preview!.start).toEqual({ x: 50, y: 100 });
        expect(preview!.end).toEqual({ x: 150, y: 200 });
    });

    test('preview line is null after touch end', () => {
        const input = new InputSystem();
        input.onTouchStart(touch(0, 50, 100));
        input.onTouchEnd(touch(0, 150, 100));

        expect(input.getPreviewLine()).toBeNull();
    });
});

describe('InputSystem multiple lines', () => {
    test('can draw multiple lines in sequence', () => {
        const input = new InputSystem(20);
        const lines: { start: { x: number; y: number }; end: { x: number; y: number } }[] = [];
        input.onLineConfirmed = (s, e) => lines.push({ start: s, end: e });

        // Line 1
        input.onTouchStart(touch(0, 0, 0));
        input.onTouchEnd(touch(0, 100, 0));

        // Line 2
        input.onTouchStart(touch(0, 0, 100));
        input.onTouchEnd(touch(0, 100, 100));

        // Line 3
        input.onTouchStart(touch(0, 0, 200));
        input.onTouchEnd(touch(0, 100, 200));

        expect(lines.length).toBe(3);
    });
});

describe('InputSystem custom minLineLength', () => {
    test('respects custom minimum line length', () => {
        const input = new InputSystem(50);
        const lines: { start: { x: number; y: number }; end: { x: number; y: number } }[] = [];
        let rejected = 0;
        input.onLineConfirmed = (s, e) => lines.push({ start: s, end: e });
        input.onLineRejected = () => rejected++;

        // 30px line → rejected (min is 50)
        input.onTouchStart(touch(0, 0, 0));
        input.onTouchEnd(touch(0, 30, 0));
        expect(rejected).toBe(1);

        // 50px line → accepted
        input.onTouchStart(touch(0, 0, 0));
        input.onTouchEnd(touch(0, 50, 0));
        expect(lines.length).toBe(1);
    });
});
