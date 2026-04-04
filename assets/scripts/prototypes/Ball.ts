// PROTOTYPE - NOT FOR PRODUCTION
// Question: Does the ball physics feel satisfying with bounce and gravity?
// Date: 2026-04-04

import {
    _decorator, Component, Node, Vec2, Vec3, UITransform, Size,
    ERigidBody2DType, RigidBody2D, CircleCollider2D, PhysicsSystem2D,
    math, Color, Sprite, Graphics
} from 'cc';

const { ccclass, property } = _decorator;

@ccclass('Ball')
export class Ball extends Component {

    private radius: number = 15;
    private maxSpeed: number = 1500;
    private launched: boolean = false;

    /**
     * Initialize the ball with physics parameters.
     * Call this once after the component is added.
     */
    init(radius: number, restitution: number, friction: number, maxSpeed: number) {
        this.radius = radius;
        this.maxSpeed = maxSpeed;

        // Add UITransform
        const uiTransform = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
        uiTransform.setContentSize(radius * 2, radius * 2);

        // Draw the ball visually using Graphics
        this.drawBall(radius);

        // Add dynamic rigidbody
        const rb = this.node.addComponent(RigidBody2D);
        rb.type = ERigidBody2DType.Dynamic;
        rb.bullet = true; // Enable CCD to prevent tunneling
        rb.allowSleep = false;
        rb.linearDamping = 0;
        rb.angularDamping = 0;
        rb.fixedRotation = true; // Ball doesn't need to spin
        rb.gravityScale = 1.0;

        // Add circle collider
        const collider = this.node.addComponent(CircleCollider2D);
        collider.radius = radius;
        collider.restitution = restitution;
        collider.friction = friction;
        collider.density = 1.0;
        collider.apply();

        console.log(`[Ball] Initialized: radius=${radius}, restitution=${restitution}, friction=${friction}`);
    }

    private drawBall(radius: number) {
        const gfx = this.node.addComponent(Graphics);
        // Neon ball: outer glow + solid fill
        // Outer glow
        gfx.strokeColor = new Color(100, 200, 255, 80);
        gfx.lineWidth = 4;
        gfx.fillColor = new Color(100, 200, 255, 200);
        gfx.circle(0, 0, radius);
        gfx.fill();
        gfx.stroke();

        // Inner bright core
        gfx.fillColor = new Color(200, 240, 255, 255);
        gfx.circle(0, 0, radius * 0.6);
        gfx.fill();
    }

    /**
     * Launch the ball with an initial velocity.
     */
    launch(velocity: Vec2) {
        const rb = this.node.getComponent(RigidBody2D);
        if (rb) {
            rb.linearVelocity = velocity;
            this.launched = true;
            console.log(`[Ball] Launched! velocity=(${velocity.x.toFixed(0)}, ${velocity.y.toFixed(0)})`);
        }
    }

    update(dt: number) {
        if (!this.launched) return;

        // Clamp speed to prevent runaway velocities
        const rb = this.node.getComponent(RigidBody2D);
        if (rb) {
            const vel = rb.linearVelocity;
            const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);

            if (speed > this.maxSpeed) {
                const scale = this.maxSpeed / speed;
                rb.linearVelocity = new Vec2(vel.x * scale, vel.y * scale);
            }
        }
    }
}
