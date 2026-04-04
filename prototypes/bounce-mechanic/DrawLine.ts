// PROTOTYPE - NOT FOR PRODUCTION
// Question: Does line drawing and collision with PolygonCollider2D thin rectangle work?
// Date: 2026-04-04

import {
    _decorator, Component, Node, Vec2, Vec3, UITransform, Size,
    ERigidBody2DType, RigidBody2D, PolygonCollider2D,
    Graphics, math, Color
} from 'cc';

const { ccclass, property } = _decorator;

@ccclass('DrawLine')
export class DrawLine extends Component {

    private startPt: Vec2 = new Vec2();
    private endPt: Vec2 = new Vec2();

    /**
     * Initialize the line with physics and visual rendering.
     * The node should already be positioned at the midpoint.
     *
     * @param start    World-space start point
     * @param end      World-space end point
     * @param thickness  Collider thickness in pixels
     * @param restitution Bounciness
     * @param friction  Friction
     * @param visualThickness  Visual line thickness for rendering
     */
    init(
        start: Vec2, end: Vec2,
        thickness: number,
        restitution: number, friction: number,
        visualThickness: number
    ) {
        this.startPt = start.clone();
        this.endPt = end.clone();

        const mid = new Vec2(
            (start.x + end.x) / 2,
            (start.y + end.y) / 2
        );

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx); // radians

        // Set node position at midpoint
        this.node.setPosition(mid.x, mid.y, 0);

        // Set rotation so the line points from start to end
        // Cocos rotation is in degrees, counter-clockwise positive
        const angleDeg = math.toDegree(angle);
        this.node.setRotationFromEuler(0, 0, angleDeg);

        // --- Visual rendering with Graphics (dual-stroke neon) ---
        // Since the node is rotated, we draw along local X axis
        const halfLen = length / 2;
        const halfThick = visualThickness / 2;

        const gfx = this.node.addComponent(Graphics);

        // Wide semi-transparent stroke (outer glow)
        gfx.strokeColor = new Color(78, 205, 196, 100); // teal, semi-transparent
        gfx.lineWidth = visualThickness * 3;
        gfx.moveTo(-halfLen, 0);
        gfx.lineTo(halfLen, 0);
        gfx.stroke();

        // Narrow opaque stroke (core line)
        gfx.strokeColor = new Color(78, 205, 196, 255); // teal, fully opaque
        gfx.lineWidth = visualThickness;
        gfx.moveTo(-halfLen, 0);
        gfx.lineTo(halfLen, 0);
        gfx.stroke();

        // Bright white center line for extra neon pop
        gfx.strokeColor = new Color(255, 255, 255, 180);
        gfx.lineWidth = visualThickness * 0.4;
        gfx.moveTo(-halfLen, 0);
        gfx.lineTo(halfLen, 0);
        gfx.stroke();

        // Small endpoint dots
        gfx.fillColor = new Color(78, 205, 196, 255);
        gfx.circle(-halfLen, 0, visualThickness);
        gfx.fill();
        gfx.circle(halfLen, 0, visualThickness);
        gfx.fill();

        // --- Physics: PolygonCollider2D as a thin rectangle ---
        // Cocos 3.8 has no EdgeCollider2D, so we use a polygon with 4 points
        // forming a thin rectangle centered on the local X axis.
        const halfCollThick = thickness / 2;

        // 4 corners of the thin rectangle (local space, line goes along X)
        const points: Vec2[] = [
            new Vec2(-halfLen, -halfCollThick), // bottom-left
            new Vec2(halfLen, -halfCollThick),  // bottom-right
            new Vec2(halfLen, halfCollThick),   // top-right
            new Vec2(-halfLen, halfCollThick),  // top-left
        ];

        // Add UITransform for proper sizing
        const uiTransform = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
        uiTransform.setContentSize(length, thickness);

        // Add static rigidbody (lines don't move)
        const rb = this.node.addComponent(RigidBody2D);
        rb.type = ERigidBody2DType.Static;

        // Add polygon collider with 4-point rectangle
        const collider = this.node.addComponent(PolygonCollider2D);
        collider.points = points;
        collider.restitution = restitution;
        collider.friction = friction;
        collider.apply();

        console.log(`[DrawLine] Created: length=${length.toFixed(0)}px, angle=${angleDeg.toFixed(1)}deg, restitution=${restitution}`);
    }
}
