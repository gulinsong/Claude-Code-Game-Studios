/**
 * GameRoot.ts — Main game entry component attached to GameRoot node.
 *
 * Initializes the game systems, loads save data, and manages the
 * high-level application lifecycle. This is the first component
 * that runs when the game starts.
 *
 * Attach to: GameRoot node in Main.scene
 */

import { _decorator, Component, Node, director, JsonAsset, AudioSource, resources } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('GameRoot')
export class GameRoot extends Component {

    @property(JsonAsset)
    public levelsData: JsonAsset | null = null;

    onLoad(): void {
        // Prevent screen sleep during gameplay
        screen?.keepScreenOn?.(true);

        // Set frame rate to 60fps
        game?.setFrameRate?.(60);

        console.log('[GameRoot] 反弹达人 initialized');
    }
}
