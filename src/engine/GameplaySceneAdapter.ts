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

import {
    _decorator, Component, Node, Vec2, Vec3,
    input, Input, EventTouch, UITransform,
    AudioSource, AudioClip, assert, instantiate, Prefab,
    tween, UIOpacity, Color, Sprite, SpriteFrame, Label,
} from 'cc';

import { JsonAsset } from 'cc';

const { ccclass, property } = _decorator;

// --- Pure logic imports ---
import { GameCoordinator } from '../gameplay/GameCoordinator';
import { UIScreenController, UIScreen } from '../ui/UIScreenController';
import { HUDController } from '../ui/UIScreenController';
import { OverlayController } from '../ui/OverlayController';
import { UI_CONFIG } from '../config/UIConfig';
import { LevelData } from '../interfaces/GameInterfaces';
import { SFX_MAP, BGM_MAP } from '../config/AudioManifest';
import { Vec2 as LogicVec2 } from '../interfaces/GameInterfaces';

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

    @property(Node)
    public pauseOverlay: Node | null = null;

    @property(Node)
    public winOverlay: Node | null = null;

    @property(Node)
    public loseOverlay: Node | null = null;

    @property(JsonAsset)
    public levelsAsset: JsonAsset | null = null;

    // ===== Audio =====

    @property(AudioSource)
    public sfxSource: AudioSource | null = null;

    @property(AudioSource)
    public bgmSource: AudioSource | null = null;

    // ===== Prefabs for dynamic spawning =====

    @property(Prefab)
    public linePrefab: Prefab | null = null;

    @property(Prefab)
    public particlePrefab: Prefab | null = null;

    // ===== Pure-logic instances =====

    private coordinator: GameCoordinator;
    private screenCtrl: UIScreenController;
    private hudCtrl: HUDController;
    private overlayCtrl: OverlayController;

    // ===== Runtime state =====

    private screenDesignWidth: number;
    private screenDesignHeight: number;
    private currentLevelData: LevelData | null;
    private loadedLevels: Map<string, LevelData>;
    private activeLineNodes: Map<string, Node>;
    private previewLineNode: Node | null;

    constructor() {
        super();
        this.coordinator = new GameCoordinator();
        this.screenCtrl = new UIScreenController();
        this.hudCtrl = new HUDController();
        this.overlayCtrl = new OverlayController();
        this.screenDesignWidth = UI_CONFIG.DESIGN_WIDTH;
        this.screenDesignHeight = UI_CONFIG.DESIGN_HEIGHT;
        this.currentLevelData = null;
        this.loadedLevels = new Map();
        this.activeLineNodes = new Map();
        this.previewLineNode = null;
    }

    // ================================================================
    // Cocos Creator lifecycle
    // ================================================================

    onLoad(): void {
        this.loadLevelDataFromAsset();
        this.wireCallbacks();
        this.setupTouchInput();
        this.hideAllOverlays();
    }

    start(): void {
        // Scene is loaded — wait for loadLevel() from UI flow
    }

    update(deltaTime: number): void {
        this.coordinator.tick(deltaTime);
    }

    onDestroy(): void {
        this.coordinator.destroy();
        this.teardownTouchInput();
    }

    // ================================================================
    // Level data loading
    // ================================================================

    /** Load level data from the JSON asset. */
    private loadLevelDataFromAsset(): void {
        if (!this.levelsAsset) return;

        const json = this.levelsAsset.json as {
            worlds: Array<{ levels: LevelData[] }>;
        };

        for (const world of json.worlds) {
            for (const level of world.levels) {
                this.loadedLevels.set(level.id, level);
            }
        }
    }

    // ================================================================
    // Level lifecycle
    // ================================================================

    /** Load and start a level by ID. */
    loadLevel(levelId: string): void {
        const levelData = this.loadedLevels.get(levelId);
        if (!levelData) {
            console.error(`[GameplaySceneAdapter] Level not found: ${levelId}`);
            return;
        }

        this.currentLevelData = levelData;

        // Clear previous level visuals
        this.clearLevelVisuals();

        // Get screen dimensions
        const uiTransform = this.node.getComponent(UITransform);
        const screenWidth = uiTransform?.width ?? this.screenDesignWidth;
        const screenHeight = uiTransform?.height ?? this.screenDesignHeight;

        // Initialize coordinator
        this.coordinator.startLevel({
            levelData,
            screenWidth,
            screenHeight,
        });

        // Initialize HUD
        this.hudCtrl.startLevel(levelData.maxLines, levelData.lightPoints.length);

        // Create visual nodes for light points
        this.spawnLightPointNodes(levelData, screenWidth, screenHeight);

        // Position ball node
        this.positionBallNode(levelData, screenWidth, screenHeight);

        // Navigate to gameplay screen
        this.screenCtrl.navigateTo(UIScreen.GAMEPLAY, { levelId });
    }

    /** Remove all dynamic visual elements. */
    private clearLevelVisuals(): void {
        // Remove line nodes
        for (const [id, node] of this.activeLineNodes) {
            node.destroy();
        }
        this.activeLineNodes.clear();

        // Remove preview line
        if (this.previewLineNode) {
            this.previewLineNode.destroy();
            this.previewLineNode = null;
        }

        // Remove light point nodes
        if (this.lightPointsParent) {
            this.lightPointsParent.removeAllChildren();
        }

        // Hide overlays
        this.hideAllOverlays();
    }

    // ================================================================
    // Visual node spawning
    // ================================================================

    /** Create light point nodes at level positions. */
    private spawnLightPointNodes(levelData: LevelData, sw: number, sh: number): void {
        if (!this.lightPointsParent) return;

        for (const lp of levelData.lightPoints) {
            const node = new Node(`lightpoint_${lp.x}_${lp.y}`);
            const pos = this.designToWorld({ x: lp.x * sw, y: lp.y * sh } as Vec2);
            node.setPosition(pos);
            node.addComponent(UITransform).setContentSize(48, 48);
            this.lightPointsParent.addChild(node);
        }
    }

    /** Position the ball node at spawn point. */
    private positionBallNode(levelData: LevelData, sw: number, sh: number): void {
        if (!this.ballNode) return;
        const pos = this.designToWorld({
            x: levelData.ball.spawn.x * sw,
            y: levelData.ball.spawn.y * sh,
        } as Vec2);
        this.ballNode.setPosition(pos);
    }

    /** Create or update a line visual node. */
    private createLineVisual(lineId: string, start: LogicVec2, end: LogicVec2): void {
        if (this.activeLineNodes.has(lineId)) return;

        let lineNode: Node;
        if (this.linePrefab) {
            lineNode = instantiate(this.linePrefab);
        } else {
            lineNode = new Node(`line_${lineId}`);
        }

        if (this.linesParent) {
            this.linesParent.addChild(lineNode);
        }
        this.activeLineNodes.set(lineId, lineNode);
    }

    /** Remove a line visual node. */
    private removeLineVisual(lineId: string): void {
        const node = this.activeLineNodes.get(lineId);
        if (node) {
            node.destroy();
            this.activeLineNodes.delete(lineId);
        }
    }

    // ================================================================
    // Overlay management
    // ================================================================

    private hideAllOverlays(): void {
        this.setOverlayVisible(this.pauseOverlay, false);
        this.setOverlayVisible(this.winOverlay, false);
        this.setOverlayVisible(this.loseOverlay, false);
    }

    private setOverlayVisible(node: Node | null, visible: boolean): void {
        if (!node) return;
        node.active = visible;
        if (visible) {
            const opacity = node.getComponent(UIOpacity) || node.addComponent(UIOpacity);
            opacity.opacity = 255;
        }
    }

    // ================================================================
    // Audio playback
    // ================================================================

    /** Play a sound effect by ID. */
    private playSfx(soundId: string): void {
        if (!this.sfxSource) return;
        const entry = SFX_MAP.get(soundId);
        if (!entry) {
            console.warn(`[GameplaySceneAdapter] Unknown SFX: ${soundId}`);
            return;
        }
        // Volume is computed as: master * channel * baseVolume
        // For now, use base volume directly
        this.sfxSource.volume = entry.baseVolume;
        this.sfxSource.playOneShot(this.sfxSource.clip!, 1);
    }

    /** Play background music by ID. */
    private playBgm(musicId: string): void {
        if (!this.bgmSource) return;
        const entry = BGM_MAP.get(musicId);
        if (!entry) {
            console.warn(`[GameplaySceneAdapter] Unknown BGM: ${musicId}`);
            return;
        }
        this.bgmSource.volume = entry.baseVolume;
        this.bgmSource.loop = entry.loop;
        this.bgmSource.play();
    }

    /** Stop background music with optional fade. */
    private stopBgm(): void {
        if (!this.bgmSource) return;
        this.bgmSource.stop();
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
        if (this.touchStartBound) input.off(Input.EventType.TOUCH_START, this.touchStartBound, this);
        if (this.touchMoveBound) input.off(Input.EventType.TOUCH_MOVE, this.touchMoveBound, this);
        if (this.touchEndBound) input.off(Input.EventType.TOUCH_END, this.touchEndBound, this);
        if (this.touchCancelBound) input.off(Input.EventType.TOUCH_CANCEL, this.touchCancelBound, this);
    }

    private onTouchStart(event: EventTouch): void {
        if (!this.screenCtrl.canInteract()) return;
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
        // --- Coordinator → Engine (Visuals) ---
        this.coordinator.onVisualEffect = (type: string, pos: LogicVec2, extra?: unknown) => {
            this.handleVisualEffect(type, pos, extra);
        };

        // --- Coordinator → Engine (Audio) ---
        this.coordinator.onPlaySound = (soundId: string) => {
            this.playSfx(soundId);
        };

        this.coordinator.onPlayMusic = (musicId: string) => {
            this.playBgm(musicId);
        };

        this.coordinator.onStopMusic = () => {
            this.stopBgm();
        };

        // --- Coordinator → HUD ---
        this.coordinator.onHUDUpdate = (data) => {
            this.hudCtrl.onLineCreated(); // Trigger HUD refresh
            this.updateHUDDisplay(data);
        };

        // --- Coordinator → Result Overlays ---
        this.coordinator.onVictory = (stars: number, time: number) => {
            if (!this.currentLevelData) return;
            const lp = this.coordinator.lightPoints;
            const hasNextLevel = this.loadedLevels.has(this.getNextLevelId());
            const nextId = hasNextLevel ? this.getNextLevelId() : null;

            const result = this.overlayCtrl.buildWinResult(
                this.currentLevelData.id,
                stars,
                lp.getCollectedCount(),
                lp.getTotalCount(),
                time,
                hasNextLevel,
                nextId,
            );
            this.screenCtrl.showWinResult();
            this.setOverlayVisible(this.winOverlay, true);
        };

        this.coordinator.onDefeat = () => {
            if (!this.currentLevelData) return;
            const lp = this.coordinator.lightPoints;
            this.overlayCtrl.buildLoseResult(
                this.currentLevelData.id,
                lp.getCollectedCount(),
                lp.getTotalCount(),
                0, // stars earned on defeat
            );
            this.screenCtrl.showLoseResult();
            this.setOverlayVisible(this.loseOverlay, true);
        };

        // --- Screen Controller → Engine ---
        this.screenCtrl.onSwitchScreen = (screen: UIScreen) => {
            this.handleScreenSwitch(screen);
        };

        this.screenCtrl.onPlaySound = (soundId: string) => {
            this.playSfx(soundId);
        };

        this.screenCtrl.onPauseGame = () => {
            this.coordinator.pause();
            this.setOverlayVisible(this.pauseOverlay, true);
        };

        this.screenCtrl.onResumeGame = () => {
            this.coordinator.resume();
            this.setOverlayVisible(this.pauseOverlay, false);
            this.screenCtrl.closePause();
        };

        this.screenCtrl.onRestartLevel = () => {
            this.hideAllOverlays();
            this.coordinator.restartLevel();
            this.hudCtrl.reset();
            if (this.currentLevelData) {
                this.hudCtrl.startLevel(
                    this.currentLevelData.maxLines,
                    this.currentLevelData.lightPoints.length,
                );
            }
        };

        this.screenCtrl.onLoadLevel = (levelId: string) => {
            this.loadLevel(levelId);
        };
    }

    // ================================================================
    // Visual effect handling
    // ================================================================

    private handleVisualEffect(type: string, pos: LogicVec2, extra?: unknown): void {
        switch (type) {
            case 'preview_line': {
                const end = extra as LogicVec2;
                this.updatePreviewLine(pos, end);
                break;
            }
            case 'hide_preview': {
                this.hidePreviewLine();
                break;
            }
            case 'confirmed_line': {
                const end = extra as LogicVec2;
                // Use a simple ID based on timestamp for confirmed lines
                this.createLineVisual(`line_${Date.now()}`, pos, end);
                break;
            }
            case 'bounce': {
                this.spawnParticleAt(pos, '#FFE66D', 8);
                break;
            }
            case 'collect': {
                this.spawnParticleAt(pos, '#4ECDC4', 12);
                break;
            }
            default:
                break;
        }
    }

    /** Spawn simple particles at a position. */
    private spawnParticleAt(pos: LogicVec2, _color: string, _count: number): void {
        // Particle effects will be implemented with Cocos Creator's
        //ParticleSystem2D or tween-based animations.
        // For now, create a brief flash node as placeholder.
        const particle = new Node('particle');
        const worldPos = this.designToWorld(pos as unknown as Vec2);
        particle.setPosition(worldPos);
        this.node.addChild(particle);

        // Auto-destroy after 0.3s
        tween(particle)
            .delay(0.3)
            .call(() => particle.destroy())
            .start();
    }

    /** Update the preview line node. */
    private updatePreviewLine(start: LogicVec2, end: LogicVec2): void {
        if (!this.previewLineNode) {
            this.previewLineNode = new Node('preview_line');
            this.node.addChild(this.previewLineNode);
        }
        // Position and rotate the preview line between start and end
        const startPos = this.designToWorld(start as unknown as Vec2);
        const endPos = this.designToWorld(end as unknown as Vec2);
        const midX = (startPos.x + endPos.x) / 2;
        const midY = (startPos.y + endPos.y) / 2;
        this.previewLineNode.setPosition(midX, midY);
        this.previewLineNode.active = true;
    }

    /** Hide the preview line. */
    private hidePreviewLine(): void {
        if (this.previewLineNode) {
            this.previewLineNode.active = false;
        }
    }

    // ================================================================
    // HUD display
    // ================================================================

    private updateHUDDisplay(data: {
        linesUsed: number;
        linesRemaining: number;
        collected: number;
        total: number;
        time: number;
    }): void {
        if (!this.hudNode) return;
        // Update HUD labels by finding child nodes
        const linesLabel = this.hudNode.getChildByName('LinesLabel');
        if (linesLabel) {
            const label = linesLabel.getComponent(Label);
            if (label) label.string = `${data.linesRemaining}`;
        }

        const collectedLabel = this.hudNode.getChildByName('CollectedLabel');
        if (collectedLabel) {
            const label = collectedLabel.getComponent(Label);
            if (label) label.string = `${data.collected}/${data.total}`;
        }

        const timeLabel = this.hudNode.getChildByName('TimeLabel');
        if (timeLabel) {
            const label = timeLabel.getComponent(Label);
            if (label) label.string = `${data.time.toFixed(1)}s`;
        }
    }

    // ================================================================
    // Screen switching
    // ================================================================

    private handleScreenSwitch(screen: UIScreen): void {
        // In a single-scene architecture, toggle node visibility.
        // In a multi-scene architecture, use director.loadScene().
        switch (screen) {
            case UIScreen.MAIN_MENU:
                this.node.active = false; // Hide gameplay scene
                break;
            case UIScreen.WORLD_SELECT:
                this.node.active = false;
                break;
            case UIScreen.LEVEL_SELECT:
                this.node.active = false;
                break;
            case UIScreen.GAMEPLAY:
                this.node.active = true;
                break;
        }
    }

    // ================================================================
    // Helpers
    // ================================================================

    /** Get the next level ID after the current one. */
    private getNextLevelId(): string {
        if (!this.currentLevelData) return '';
        const w = this.currentLevelData.world;
        const l = this.currentLevelData.level;
        return `${w}-${l + 1}`;
    }

    /** Convert screen UI location to design-resolution coordinates. */
    private screenToDesign(uiPos: Vec2): Vec2 {
        const uiTransform = this.node.getComponent(UITransform);
        if (!uiTransform) return uiPos;

        const scaleX = this.screenDesignWidth / uiTransform.width;
        const scaleY = this.screenDesignHeight / uiTransform.height;

        return new Vec2(uiPos.x * scaleX, uiPos.y * scaleY);
    }

    /** Convert design-resolution coordinates to world position for node placement. */
    private designToWorld(designPos: Vec2): Vec3 {
        const uiTransform = this.node.getComponent(UITransform);
        if (!uiTransform) return new Vec3(designPos.x, designPos.y, 0);

        const scaleY = uiTransform.height / this.screenDesignHeight;

        return new Vec3(
            designPos.x - this.screenDesignWidth / 2,
            (designPos.y - this.screenDesignHeight / 2) * scaleY,
            0,
        );
    }
}
