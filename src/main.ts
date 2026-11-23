import './styles.css';
import { sound } from './audio';
import { bridge } from './bridge';
import { loadMetaSave, parseMetaSaveJson, persistMetaSave, pickBetterSave } from './data/meta';
import { fetchLiveNews } from './data/news';
import { StillpointGame } from './engine/game';
import { HudView } from './ui/hud';
import { OverlayController } from './ui/menus';

function bootstrap(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const uiRoot = document.getElementById('ui-root') as HTMLDivElement;

  const save = loadMetaSave();
  sound.setSettings(save.settings.music, save.settings.sfx);
  sound.setSector(save.selectedSector);
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
    onVisualPrefsChanged: () => game.refreshVisualPrefs(),
    onReplaceSave: (next) => game.replaceSave(next),
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
      const pauseBuild =
        phase === 'paused'
          ? {
              sectorId: game.sectorId,
              vesselId: game.vesselId,
              coreId: game.coreId,
              heatCount: save.activeHeat.length,
              elapsed: game.stats.elapsed,
              brinkShocks: game.stats.brinkShocks,
              pressureReleases: game.stats.pressureReleases,
              weapons: game.player.weapons,
              passives: game.player.passives,
              relics: game.player.relics,
              damageMult: game.player.damageMult,
              fireRateMult: game.player.fireRateMult,
              critChance: game.player.critChance,
              moveSpeed: game.player.moveSpeed,
              armor: game.player.armor
            }
          : undefined;
      overlays.renderPhase(phase, {
        choices,
        level: game.player.level,
        rerolls: game.player.rerolls,
        isBossChest: game.isBossDraft,
        stats,
        pauseBuild
      });
    },
    onHudTick: (snap) => {
      hud.update(snap);
    },
    onUnlockNotice: (text) => {
      overlays.showToast(text);
    }
  });

  bridge.onCloudSave((cloudJson) => {
    if (game.phase !== 'menu') return;
    const incoming = parseMetaSaveJson(cloudJson);
    if (!incoming) return;
    const best = pickBetterSave(save, incoming);
    if (best === incoming) {
      game.replaceSave(best);
      persistMetaSave(save);
      overlays.refreshExternalState();
      overlays.showToast('iCloud save synced');
    }
  });

  bridge.onGameCenterChange(() => {
    overlays.refreshExternalState();
  });

  bridge.onAdReadyChange(() => {
    overlays.refreshExternalState();
  });

  fetchLiveNews(() => {
    overlays.refreshExternalState();
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
