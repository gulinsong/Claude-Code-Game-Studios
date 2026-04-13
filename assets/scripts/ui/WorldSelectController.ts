/**
 * WorldSelectController.ts — Controls the world selection screen.
 *
 * Displays world cards with star progress and locked/unlocked state.
 * Each world card is clickable if the world is unlocked.
 *
 * Attach to: WorldSelectPanel node
 */

import { _decorator, Component, Node, instantiate, Prefab, Label, Sprite, Color } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('WorldSelectController')
export class WorldSelectController extends Component {

    @property(Node)
    public worldCardsParent: Node | null = null;

    @property(Prefab)
    public worldCardPrefab: Prefab | null = null;

    @property(Label)
    public totalStarsLabel: Label | null = null;

    private worldCount = 4;

    onLoad(): void {
        this.refreshWorldCards();
    }

    private refreshWorldCards(): void {
        if (!this.worldCardsParent) return;

        for (let i = 0; i < this.worldCount; i++) {
            const card = this.worldCardPrefab
                ? instantiate(this.worldCardPrefab)
                : new Node(`World${i + 1}`);
            this.worldCardsParent.addChild(card);
        }
    }

    onBack(): void {
        console.log('[WorldSelect] Back → Main Menu');
        // director.loadScene('Main');
    }

    onWorldSelected(worldId: number): void {
        console.log(`[WorldSelect] World ${worldId} selected → LevelSelect`);
        // TODO: Navigate to LevelSelect with worldId
    }
}
