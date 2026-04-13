/**
 * LevelSelectController.ts — Controls the level selection grid.
 *
 * Displays a 4×2 grid of level cards with star ratings.
 * Handles locked/unlocked/new state per level.
 *
 * Attach to: LevelSelectPanel node
 */

import { _decorator, Component, Node, instantiate, Prefab, Label } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('LevelSelectController')
export class LevelSelectController extends Component {

    @property(Node)
    public gridParent: Node | null = null;

    @property(Prefab)
    public levelCardPrefab: Prefab | null = null;

    @property(Label)
    public worldNameLabel: Label | null = null;

    @property(Label)
    public worldStarsLabel: Label | null = null;

    private currentWorldId: number = 1;

    /** Called when navigating to this screen. */
    setWorld(worldId: number): void {
        this.currentWorldId = worldId;
        this.refreshGrid();
    }

    onLoad(): void {
        this.refreshGrid();
    }

    private refreshGrid(): void {
        if (!this.gridParent) return;
        this.gridParent.removeAllChildren();

        for (let i = 1; i <= 8; i++) {
            const card = this.levelCardPrefab
                ? instantiate(this.levelCardPrefab)
                : new Node(`Level_${this.currentWorldId}-${i}`);
            this.gridParent.addChild(card);
        }
    }

    onBack(): void {
        console.log('[LevelSelect] Back → WorldSelect');
    }

    onLevelSelected(levelId: string): void {
        console.log(`[LevelSelect] Level ${levelId} selected → Gameplay`);
        // TODO: Navigate to gameplay with levelId
    }
}
