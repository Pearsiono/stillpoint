import './styles.css';
import { sound } from './audio';
import { bridge } from './bridge';
import { loadMetaSave } from './data/meta';
import { StillpointGame } from './engine/game';
import { HudView } from './ui/hud';
import { OverlayController } from './ui/menus';

function bootstrap(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const uiRoot = document.getElementById('ui-root') as HTMLDivElement;

  const save = loadMetaSave();
  sound.setSettings(save.settings.music, save.settings.sfx);
  bridge.setHapticsEnabled(save.settings.haptics);

  let game!: StillpointGame;

  const hud = new HudView(uiRoot, () => {
    game.pauseGame();
  });

  const overlays = new OverlayController(uiRoot, save, {
    onStartRun: () => game.startNewRun(),
    onSelectVessel: (vessel) => game.setVessel(vessel),
    onSelectCore: (core) => game.setCore(core),
    onSelectSkin: (skin) => game.setSkin(skin),
    onSelectSector: (sector) => game.setSector(sector),
    onToggleHeat: (heat) => game.toggleHeat(heat),
    onRandomizeBuild: () => game.randomizeBuild(),
    onSheetToggle: (open) => game.setMenuSheetOpen(open),
    onSelectUpgrade: (choiceId) => game.selectUpgrade(choiceId),
    onReroll: () => game.rerollChoices(),
    onResume: () => game.resumeGame(),
    onQuitToMenu: () => game.returnToMenu(),
    onContinueEndless: () => game.continueEndless()
  });

  game = new StillpointGame(canvas, save, {
    onPhaseChange: (phase, choices, stats) => {
      hud.setVisible(phase === 'playing' || phase === 'levelup' || phase === 'paused');
      overlays.renderPhase(phase, {
        choices,
        level: game.player.level,
        rerolls: game.player.rerolls,
        isBossChest: game.isBossDraft,
        stats
      });
    },
    onHudTick: (snap) => {
      hud.update(snap);
    },
    onUnlockNotice: (text) => {
      overlays.showToast(text);
    }
  });

  // Unlock WebAudio cleanly on very first menu tap on iOS
  document.addEventListener('pointerdown', () => sound.unlock(), { passive: true });

  overlays.renderPhase('menu');
  game.startLoop();

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      if (game.phase === 'playing') game.pauseGame();
      else if (game.phase === 'paused') game.resumeGame();
    }
  });
}

bootstrap();
