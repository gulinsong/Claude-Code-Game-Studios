// PROTOTYPE - NOT FOR PRODUCTION
// Question: Does drawing lines to redirect a bouncing ball feel satisfying and intuitive?
// Date: 2026-04-04

import {
    _decorator, Component, Node, Vec2, Vec3, UITransform, Canvas,
    input, Input, EventTouch, Camera, Color, math, Size, view, screen,
    PhysicsSystem2D, ERigidBody2DType, Contact2DType, Collider2D,
    IPhysics2DContact, ResolutionPolicy
} from 'cc';
import { Ball } from './Ball';
import { DrawLine } from './DrawLine';

const { ccclass, property } = _decorator;

/** Hardcoded prototype config -- all values from GDD */
const CONFIG = {
    // Ball
    ballRadius: 15,
    ballRestitution: 0.95,
    ballFriction: 0.0,
    gravity: 980,
    initialSpeed: 300,
    maxSpeed: 1500,

    // Lines
    lineRestitution: 0.95,
    lineFriction: 0.2,
    maxLines: 3,
    minLineLength: 20,

    // Visual
    visualThickness: 4,
    colliderThickness: 6,

    // Design resolution (portrait, WeChat Mini-Game)
    designWidth: 750,
    designHeight: 1334,
};

@ccclass('BouncePrototype')
export class BouncePrototype extends Component {

    private ball: Ball | null = null;
    private lines: DrawLine[] = [];
    private lineCount = 0;

    // Touch tracking
    private touchStart: Vec2 = new Vec2();
    private isDrawing = false;

    // Preview line node
    private previewNode: Node | null = null;

    // Boundary walls
    private wallNodes: Node[] = [];

    // Label for status display
    private statusNode: Node | null = null;

    onLoad() {
        console.log('[BouncePrototype] Setting up...');

        // Set design resolution
        const designSize = new Size(CONFIG.designWidth, CONFIG.designHeight);
        view.setDesignResolutionSize(
            designSize.width, designSize.height,
            ResolutionPolicy.FIXED_WIDTH
        );

        // Enable 2D physics
        const physics = PhysicsSystem2D.instance;
        physics.enable = true;
        // gravity is positive-down in Cocos (y increases downward in UI space,
        // but physics uses standard coords -- we set gravity vector pointing down)
        physics.gravity = new Vec2(0, -CONFIG.gravity);

        // Create boundary walls (left, right, top -- bottom is open for "out of bounds")
        this.createBoundaries();

        // Create ball at top-center
        this.createBall();

        // Setup touch input
        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);

        // Create status label
        this.createStatusLabel();

        console.log('[BouncePrototype] Ready! Draw lines to redirect the ball.');
    }

    private createBoundaries() {
        const w = CONFIG.designWidth;
        const h = CONFIG.designHeight;

        // Left wall
        this.createWall('LeftWall', new Vec2(-w / 2, 0), w, h * 3);
        // Right wall
        this.createWall('RightWall', new Vec2(w / 2, 0), w, h * 3);
        // Top wall
        this.createWall('TopWall', new Vec2(0, h / 2), w * 3, h);

        // No bottom wall -- ball falls through for "out of bounds"
    }

    private createWall(name: string, pos: Vec2, width: number, height: number) {
        const node = new Node(name);
        this.node.addChild(node);
        node.setPosition(pos.x, pos.y, 0);

        // Add UITransform for sizing
        const uiTransform = node.addComponent(UITransform);
        uiTransform.setContentSize(width, height);

        // Add static rigidbody
        const rb = node.addComponent('cc.RigidBody2D') as any;
        rb.type = ERigidBody2DType.Static;

        // Add box collider
        const collider = node.addComponent('cc.BoxCollider2D') as any;
        collider.size = new Size(width, height);
        // Boundary restitution slightly less bouncy
        collider.restitution = 0.8;
        collider.friction = 0.0;
        collider.apply();

        this.wallNodes.push(node);
    }

    private createBall() {
        const node = new Node('Ball');
        this.node.addChild(node);
        // Start at top-center area
        node.setPosition(0, CONFIG.designHeight / 2 - 100, 0);

        const ball = node.addComponent(Ball);
        ball.init(CONFIG.ballRadius, CONFIG.ballRestitution, CONFIG.ballFriction, CONFIG.maxSpeed);

        this.ball = ball;

        // Drop the ball with a slight initial velocity downward
        // (gravity will do the main work, but we give it a push)
        this.scheduleOnce(() => {
            if (this.ball) {
                this.ball.launch(Vec2.UNIT_Y.clone().multiplyScalar(-CONFIG.initialSpeed));
            }
        }, 0.5);
    }

    // ---- Touch handling ----

    private onTouchStart(event: EventTouch) {
        const uiPos = event.getUILocation();
        this.touchStart.set(uiPos.x - CONFIG.designWidth / 2, uiPos.y - CONFIG.designHeight / 2);
        this.isDrawing = true;
    }

    private onTouchMove(event: EventTouch) {
        if (!this.isDrawing) return;
        // Could show preview here -- keeping it minimal for prototype
    }

    private onTouchEnd(event: EventTouch) {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        const uiPos = event.getUILocation();
        const touchEnd = new Vec2(
            uiPos.x - CONFIG.designWidth / 2,
            uiPos.y - CONFIG.designHeight / 2
        );

        const lineVec = new Vec2(
            touchEnd.x - this.touchStart.x,
            touchEnd.y - this.touchStart.y
        );
        const lineLength = lineVec.length();

        // Check: if max lines reached, clear all lines and start fresh
        if (this.lineCount >= CONFIG.maxLines) {
            console.log('[BouncePrototype] Max lines reached! Clearing all lines for quick iteration.');
            this.clearAllLines();
            return;
        }

        // Validate minimum length
        if (lineLength < CONFIG.minLineLength) {
            console.log(`[BouncePrototype] Line too short (${lineLength.toFixed(0)}px < ${CONFIG.minLineLength}px). Ignored.`);
            return;
        }

        // Create the line
        this.createLine(this.touchStart.clone(), touchEnd.clone());
    }

    private createLine(start: Vec2, end: Vec2) {
        const node = new Node(`Line_${this.lineCount}`);
        this.node.addChild(node);

        // Position at midpoint
        const mid = new Vec2(
            (start.x + end.x) / 2,
            (start.y + end.y) / 2
        );
        node.setPosition(mid.x, mid.y, 0);

        const drawLine = node.addComponent(DrawLine);
        drawLine.init(
            start, end,
            CONFIG.colliderThickness,
            CONFIG.lineRestitution,
            CONFIG.lineFriction,
            CONFIG.visualThickness
        );

        this.lines.push(drawLine);
        this.lineCount++;

        console.log(`[BouncePrototype] Line created (${this.lineCount}/${CONFIG.maxLines}). Length: ${Vec2.distance(start, end).toFixed(0)}px`);
        this.updateStatus();
    }

    private clearAllLines() {
        for (const line of this.lines) {
            if (line.node) {
                line.node.destroy();
            }
        }
        this.lines = [];
        this.lineCount = 0;
        console.log('[BouncePrototype] All lines cleared. Draw again!');
        this.updateStatus();
    }

    // ---- UI helpers ----

    private createStatusLabel() {
        // We'll just log status to console for this prototype.
        // A real version would use a Label component.
        this.updateStatus();
    }

    private updateStatus() {
        const remaining = CONFIG.maxLines - this.lineCount;
        console.log(`[Status] Lines: ${this.lineCount}/${CONFIG.maxLines} | Remaining: ${remaining}`);
    }

    update(dt: number) {
        // Check if ball fell out of bounds (below screen)
        if (this.ball && this.ball.node) {
            const pos = this.ball.node.position;
            if (pos.y < -(CONFIG.designHeight / 2 + 100)) {
                console.log('[BouncePrototype] Ball out of bounds! Resetting...');
                this.resetBall();
            }
        }
    }

    private resetBall() {
        if (this.ball) {
            this.ball.node.setPosition(0, CONFIG.designHeight / 2 - 100, 0);
            // Reset velocity by removing and re-adding the rigidbody
            const rb = this.ball.node.getComponent('cc.RigidBody2D') as any;
            if (rb) {
                rb.linearVelocity = new Vec2(0, 0);
                rb.angularVelocity = 0;
            }
            // Re-launch after a short delay
            this.scheduleOnce(() => {
                if (this.ball) {
                    this.ball.launch(Vec2.UNIT_Y.clone().multiplyScalar(-CONFIG.initialSpeed));
                }
            }, 0.3);
        }

        // Also clear lines on reset for quick iteration
        this.clearAllLines();
    }

    onDestroy() {
        input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }
}
