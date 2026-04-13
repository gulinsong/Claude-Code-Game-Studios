/**
 * GameplayHUD.ts — Runtime HUD component for the gameplay screen.
 *
 * Updates line count, light point count, and timer labels.
 * Provides the pause button handler.
 *
 * Attach to: HUD node under Canvas in Main.scene
 */

import { _decorator, Component, Node, Label } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('GameplayHUD')
export class GameplayHUD extends Component {

    @property(Label)
    public linesLabel: Label | null = null;

    @property(Label)
    public collectedLabel: Label | null = null;

    @property(Label)
    public timeLabel: Label | null = null;

    @property(Node)
    public lineDotsParent: Node | null = null;

    /** Update the HUD display. */
    updateDisplay(linesRemaining: number, collected: number, total: number, time: number): void {
        if (this.linesLabel) {
            this.linesLabel.string = `${linesRemaining}`;
        }
        if (this.collectedLabel) {
            this.collectedLabel.string = `${collected}/${total}`;
        }
        if (this.timeLabel) {
            this.timeLabel.string = `${time.toFixed(1)}s`;
        }
    }

    onPausePressed(): void {
        console.log('[HUD] Pause pressed');
        // Delegate to GameplaySceneAdapter via event
        this.node.emit('game-pause');
    }
}
