/**
 * InputBridge.ts — Standalone input bridge for Cocos Creator.
 *
 * Converts Cocos Creator touch events into game-level touch data
 * suitable for InputSystem. Can be used independently from
 * GameplaySceneAdapter when only input forwarding is needed
 * (e.g., during prototyping or unit testing with a mock renderer).
 *
 * Engine: Cocos Creator 3.8.8 LTS
 */

import { _decorator, Component, Node, Vec2, input, Input, EventTouch, UITransform } from 'cc';

const { ccclass, property } = _decorator;

/** Normalized touch data for the logic layer. */
export interface BridgeTouchData {
    x: number;
    y: number;
}

@ccclass('InputBridge')
export class InputBridge extends Component {

    /** Callback for touch start. */
    public onTouchStart: ((data: BridgeTouchData) => void) | null = null;

    /** Callback for touch move. */
    public onTouchMove: ((data: BridgeTouchData) => void) | null = null;

    /** Callback for touch end. */
    public onTouchEnd: ((data: BridgeTouchData) => void) | null = null;

    /** Callback for touch cancel. */
    public onTouchCancel: (() => void) | null = null;

    /** Whether input is currently enabled. */
    private enabled: boolean;

    /** Design resolution for coordinate normalization. */
    private designWidth: number;
    private designHeight: number;

    constructor() {
        super();
        this.enabled = true;
        this.designWidth = 750;
        this.designHeight = 1334;
    }

    onLoad(): void {
        input.on(Input.EventType.TOUCH_START, this.handleTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE, this.handleTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this.handleTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.handleTouchCancel, this);
    }

    onDestroy(): void {
        input.off(Input.EventType.TOUCH_START, this.handleTouchStart, this);
        input.off(Input.EventType.TOUCH_MOVE, this.handleTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this.handleTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this.handleTouchCancel, this);
    }

    /** Enable or disable input forwarding. */
    setEnabled(value: boolean): void {
        this.enabled = value;
    }

    // ===== Private handlers =====

    private handleTouchStart(event: EventTouch): void {
        if (!this.enabled) return;
        const data = this.convertTouch(event);
        if (this.onTouchStart) this.onTouchStart(data);
    }

    private handleTouchMove(event: EventTouch): void {
        if (!this.enabled) return;
        const data = this.convertTouch(event);
        if (this.onTouchMove) this.onTouchMove(data);
    }

    private handleTouchEnd(event: EventTouch): void {
        if (!this.enabled) return;
        const data = this.convertTouch(event);
        if (this.onTouchEnd) this.onTouchEnd(data);
    }

    private handleTouchCancel(): void {
        if (!this.enabled) return;
        if (this.onTouchCancel) this.onTouchCancel();
    }

    /** Convert Cocos touch UI location to design-resolution coordinates. */
    private convertTouch(event: EventTouch): BridgeTouchData {
        const uiLoc = event.getUILocation();
        const uiTransform = this.node.getComponent(UITransform);
        if (!uiTransform) {
            return { x: uiLoc.x, y: uiLoc.y };
        }

        const scaleX = this.designWidth / uiTransform.width;
        const scaleY = this.designHeight / uiTransform.height;

        return {
            x: uiLoc.x * scaleX,
            y: uiLoc.y * scaleY,
        };
    }
}
