/**
 * MainMenuController.ts — Controls the main menu screen.
 *
 * Handles "Start Game" and "Continue Game" buttons.
 * Navigates to WorldSelect screen.
 *
 * Attach to: MainMenuPanel node in Main.scene
 */

import { _decorator, Component, Node, director } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('MainMenuController')
export class MainMenuController extends Component {

    @property(Node)
    public continueBtn: Node | null = null;

    onLoad(): void {
        // Hide continue button if no save data
        if (this.continueBtn) {
            // TODO: Check SaveSystem for lastPlayedLevel
            this.continueBtn.active = false;
        }
    }

    onStartGame(): void {
        console.log('[MainMenu] Start Game → WorldSelect');
        // TODO: Navigate to WorldSelect
        // director.loadScene('WorldSelect');
    }

    onContinue(): void {
        console.log('[MainMenu] Continue → Last Level');
        // TODO: Load last played level from SaveSystem
    }
}
