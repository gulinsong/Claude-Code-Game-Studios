/**
 * GameplaySceneAdapter.ts — Cocos Creator component that bridges the
 * GameplayScene lifecycle to GameCoordinator.
 *
 * This adapter:
 * 1. Creates and owns a GameCoordinator instance
 * 2. Wires coordinator callbacks to Cocos Creator node manipulation
 * 3. Forwards Cocos lifecycle events (start, update, onDestroy)
 * 4. Forwards touch events to the coordinator's input system
 * 5. Bridges Box2D collision callbacks to coordinator methods
 *
 * This file IS the engine boundary — everything below this imports Cocos APIs.
 *
 * GDD: design/gdd/ui-system.md § engine integration
 * Engine: Cocos Creator 3.8.8 LTS
 */

// --- Cocos Creator type imports ---
// These types are available when running inside Cocos Creator.
// For pure-TS compilation outside the engine, use the stubs in src/engine/stubs/.
import { _decorator, Component, Node, Vec2, Vec3, input, Input, EventTouch, UITransform } from 'cc';

const { ccclass, property } = _decorator;

// --- Pure logic imports ---
import { GameCoordinator, LevelStartOptions } from '../gameplay/GameCoordinator';
import { UIScreenController, UIScreen } from '../ui/UIScreenController';
import { HUDController } from '../ui/HUDController';
import { OverlayController } from '../ui/OverlayController';
import { UI_CONFIG } from '../config/UIConfig';

@ccclass('GameplaySceneAdapter')
export class GameplaySceneAdapter extends Component {

    // ===== Injected scene references =====

    @property(Node)
    public ballNode: Node | null = null;

    @property(Node)
    public linesParent: Node | null = null;

    @property(Node)
    public lightPointsParent: Node | null = null;

    @property(Node)
    public hudNode: Node | null = null;

    @property(Node)
    public overlayParent: Node | null = null;

    // ===== Pure-logic instances =====

    private coordinator: GameCoordinator;
    private screenCtrl: UIScreenController;
    private hudCtrl: HUDController;
    private overlayCtrl: OverlayController;

    // ===== Runtime state =====

    private screenDesignWidth: number;
    private screenDesignHeight: number;

    constructor() {
        super();
        this.coordinator = new GameCoordinator();
        this.screenCtrl = new UIScreenController();
        this.hudCtrl = new HUDController();
        this.overlayCtrl = new OverlayController();
        this.screenDesignWidth = UI_CONFIG.DESIGN_WIDTH;
        this.screenDesignHeight = UI_CONFIG.DESIGN_HEIGHT;
    }

    // ================================================================
    // Cocos Creator lifecycle
    // ================================================================

    onLoad(): void {
        this.wireCallbacks();
        this.setupTouchInput();
    }

    start(): void {
        // Scene is loaded — wait for loadLevel() call from UIScreenController flow
    }

    update(deltaTime: number): void {
        this.coordinator.tick(deltaTime);
    }

    onDestroy(): void {
        this.coordinator.destroy();
        this.teardownTouchInput();
    }

    // ================================================================
    // Level loading
    // ================================================================

    /**
     * Load a level by ID using data from LevelSystem.
     * Called by UIScreenController when navigating to GAMEPLAY.
     */
    loadLevel(levelId: string): void {
        // TODO: Fetch level data from LevelSystem or assets/data/levels.json
        // const levelData = this.coordinator.levelSystem.getLevel(levelId);
        // if (!levelData) { console.error(`Level not found: ${levelId}`); return; }
        //
        // const uiTransform = this.node.getComponent(UITransform);
        // const screenWidth = uiTransform?.width ?? this.screenDesignWidth;
        // const screenHeight = uiTransform?.height ?? this.screenDesignHeight;
        //
        // this.coordinator.startLevel({
        //     levelData,
        //     screenWidth,
        //     screenHeight,
        // });
        //
        // this.hudCtrl.startLevel(levelData.maxLines, levelData.lightPoints.length);
    }

    // ================================================================
    // Touch input bridge
    // ================================================================

    private touchStartBound: ((event: EventTouch) => void) | null = null;
    private touchMoveBound: ((event: EventTouch) => void) | null = null;
    private touchEndBound: ((event: EventTouch) => void) | null = null;
    private touchCancelBound: ((event: EventTouch) => void) | null = null;

    private setupTouchInput(): void {
        this.touchStartBound = this.onTouchStart.bind(this);
        this.touchMoveBound = this.onTouchMove.bind(this);
        this.touchEndBound = this.onTouchEnd.bind(this);
        this.touchCancelBound = this.onTouchCancel.bind(this);

        input.on(Input.EventType.TOUCH_START, this.touchStartBound, this);
        input.on(Input.EventType.TOUCH_MOVE, this.touchMoveBound, this);
        input.on(Input.EventType.TOUCH_END, this.touchEndBound, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.touchCancelBound, this);
    }

    private teardownTouchInput(): void {
        if (this.touchStartBound) {
            input.off(Input.EventType.TOUCH_START, this.touchStartBound, this);
        }
        if (this.touchMoveBound) {
            input.off(Input.EventType.TOUCH_MOVE, this.touchMoveBound, this);
        }
        if (this.touchEndBound) {
            input.off(Input.EventType.TOUCH_END, this.touchEndBound, this);
        }
        if (this.touchCancelBound) {
            input.off(Input.EventType.TOUCH_CANCEL, this.touchCancelBound, this);
        }
    }

    private onTouchStart(event: EventTouch): void {
        const loc = this.screenToDesign(event.getUILocation());
        this.coordinator.handleTouchStart({ x: loc.x, y: loc.y });
    }

    private onTouchMove(event: EventTouch): void {
        const loc = this.screenToDesign(event.getUILocation());
        this.coordinator.handleTouchMove({ x: loc.x, y: loc.y });
    }

    private onTouchEnd(event: EventTouch): void {
        const loc = this.screenToDesign(event.getUILocation());
        this.coordinator.handleTouchEnd({ x: loc.x, y: loc.y });
    }

    private onTouchCancel(): void {
        this.coordinator.handleTouchCancel();
    }

    // ================================================================
    // Callback wiring
    // ================================================================

    private wireCallbacks(): void {
        // --- Coordinator → Engine ---
        this.coordinator.onVisualEffect = (_type: string, _pos: unknown, _extra?: unknown) => {
            // TODO: Create/update Cocos nodes for visual effects
            // Example: bounce particles at pos, line glow, collection sparkle
        };

        this.coordinator.onPlaySound = (soundId: string) => {
            // TODO: Call AudioSystem to play sound
            // this.audio.play(soundId);
        };

        this.coordinator.onPlayMusic = (musicId: string) => {
            // TODO: Start background music
        };

        this.coordinator.onStopMusic = () => {
            // TODO: Stop background music
        };

        this.coordinator.onHUDUpdate = (data) => {
            // TODO: Update HUD nodes (line dots, light point counter, timer)
        };

        this.coordinator.onVictory = (stars: number, time: number) => {
            // TODO: Build win result and show overlay
            // const result = this.overlayCtrl.buildWinResult(...);
            // this.screenCtrl.showWinResult();
        };

        this.coordinator.onDefeat = () => {
            // TODO: Build lose result and show overlay
            // this.screenCtrl.showLoseResult();
        };

        // --- Screen Controller → Engine ---
        this.screenCtrl.onSwitchScreen = (screen: UIScreen) => {
            // TODO: Switch Cocos Creator scene or toggle node visibility
        };

        this.screenCtrl.onPlaySound = (soundId: string) => {
            // TODO: Play UI sound
        };

        this.screenCtrl.onPauseGame = () => {
            this.coordinator.pause();
        };

        this.screenCtrl.onResumeGame = () => {
            this.coordinator.resume();
        };

        this.screenCtrl.onRestartLevel = () => {
            this.coordinator.restartLevel();
        };

        this.screenCtrl.onLoadLevel = (levelId: string) => {
            this.loadLevel(levelId);
        };
    }

    // ================================================================
    // Coordinate conversion
    // ================================================================

    /** Convert screen UI location to design-resolution coordinates. */
    private screenToDesign(uiPos: Vec2): Vec2 {
        // Cocos Creator's getUILocation() returns screen coordinates.
        // With FIXED_WIDTH policy, we scale Y to match design resolution.
        const uiTransform = this.node.getComponent(UITransform);
        if (!uiTransform) return uiPos;

        const scaleX = UI_CONFIG.DESIGN_WIDTH / uiTransform.width;
        const scaleY = UI_CONFIG.DESIGN_HEIGHT / uiTransform.height;

        return new Vec2(
            uiPos.x * scaleX,
            uiPos.y * scaleY,
        );
    }

    /** Convert design-resolution coordinates to world position for node placement. */
    private designToWorld(designPos: Vec2): Vec3 {
        // With FIXED_WIDTH, X is 1:1, Y is scaled
        const uiTransform = this.node.getComponent(UITransform);
        if (!uiTransform) return new Vec3(designPos.x, designPos.y, 0);

        const scaleY = uiTransform.height / UI_CONFIG.DESIGN_HEIGHT;

        return new Vec3(
            designPos.x - UI_CONFIG.DESIGN_WIDTH / 2,
            (designPos.y - UI_CONFIG.DESIGN_HEIGHT / 2) * scaleY,
            0,
        );
    }
}
