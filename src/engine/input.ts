import { InputSnapshot } from '../types';

const JOYSTICK_MAX_RADIUS = 56;
const JOYSTICK_DEADZONE = 5;

export class InputController {
  private canvas: HTMLCanvasElement;
  private activePointerId: number | null = null;
  private pointerDown = false;
  private originX = 0;
  private originY = 0;
  private currentX = 0;
  private currentY = 0;
  private hasInteracted = false;
  private mode: 'touch' | 'keyboard' = 'touch';
  private keys = new Set<string>();
  private enabled = false;
  private onFirstGestureCallback?: () => void;

  constructor(canvas: HTMLCanvasElement, onFirstGesture?: () => void) {
    this.canvas = canvas;
    this.onFirstGestureCallback = onFirstGesture;
    this.bindEvents();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.pointerDown = false;
      this.activePointerId = null;
      this.keys.clear();
    }
  }

  resetForNewRun(): void {
    this.pointerDown = false;
    this.activePointerId = null;
    this.hasInteracted = false;
    this.keys.clear();
  }

  private bindEvents(): void {
    // Pointer events unify iOS touch & desktop mouse drag seamlessly
    this.canvas.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    window.addEventListener('pointermove', this.onPointerMove, { passive: false });
    window.addEventListener('pointerup', this.onPointerUp, { passive: false });
    window.addEventListener('pointercancel', this.onPointerUp, { passive: false });

    // Prevent iOS gesture scroll/pinch inside canvas
    this.canvas.addEventListener(
      'touchstart',
      (e) => {
        if (this.enabled) e.preventDefault();
      },
      { passive: false }
    );
    this.canvas.addEventListener(
      'touchmove',
      (e) => {
        if (this.enabled) e.preventDefault();
      },
      { passive: false }
    );

    // Desktop keyboard support (WASD / Arrows + Space / Shift for Stillpoint)
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => {
      this.pointerDown = false;
      this.activePointerId = null;
      this.keys.clear();
    });
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.onFirstGestureCallback?.();
    if (!this.enabled) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (this.activePointerId !== null) return;

    e.preventDefault();
    this.mode = 'touch';
    this.activePointerId = e.pointerId;
    this.pointerDown = true;
    this.hasInteracted = true;
    this.originX = e.clientX;
    this.originY = e.clientY;
    this.currentX = e.clientX;
    this.currentY = e.clientY;
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.enabled || !this.pointerDown || e.pointerId !== this.activePointerId) return;
    e.preventDefault();
    this.currentX = e.clientX;
    this.currentY = e.clientY;

    // Dynamic floating joystick: gently follows thumb if pulled past max radius
    const dx = this.currentX - this.originX;
    const dy = this.currentY - this.originY;
    const dist = Math.hypot(dx, dy);
    if (dist > JOYSTICK_MAX_RADIUS * 1.15) {
      const pull = dist - JOYSTICK_MAX_RADIUS * 1.15;
      this.originX += (dx / dist) * pull;
      this.originY += (dy / dist) * pull;
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.activePointerId) return;
    this.pointerDown = false;
    this.activePointerId = null;
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.enabled) return;
    const code = e.code;
    if (
      code === 'KeyW' ||
      code === 'KeyA' ||
      code === 'KeyS' ||
      code === 'KeyD' ||
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'ArrowLeft' ||
      code === 'ArrowRight' ||
      code === 'Space' ||
      code === 'ShiftLeft' ||
      code === 'ShiftRight'
    ) {
      e.preventDefault();
      this.onFirstGestureCallback?.();
      this.mode = 'keyboard';
      this.hasInteracted = true;
      this.keys.add(code);
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  sample(): InputSnapshot {
    if (!this.enabled) {
      return {
        moveX: 0,
        moveY: 0,
        isMoving: false,
        wantsStillpoint: false,
        hasInteracted: this.hasInteracted,
        joystickActive: false,
        joyOriginX: 0,
        joyOriginY: 0,
        joyCurrentX: 0,
        joyCurrentY: 0,
        mode: this.mode
      };
    }

    if (this.mode === 'keyboard') {
      let kx = 0;
      let ky = 0;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) kx -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) kx += 1;
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) ky -= 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) ky += 1;
      const len = Math.hypot(kx, ky);
      if (len > 0) {
        kx /= len;
        ky /= len;
      }
      const spaceHeld =
        this.keys.has('Space') || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');

      return {
        moveX: spaceHeld ? 0 : kx,
        moveY: spaceHeld ? 0 : ky,
        isMoving: !spaceHeld && len > 0.05,
        wantsStillpoint: spaceHeld,
        hasInteracted: this.hasInteracted,
        joystickActive: false,
        joyOriginX: 0,
        joyOriginY: 0,
        joyCurrentX: 0,
        joyCurrentY: 0,
        mode: 'keyboard'
      };
    }

    // Touch / Mouse drag mode: thumb DOWN = move in Normal Time; thumb LIFTED = STILLPOINT!
    let mx = 0;
    let my = 0;
    let isMoving = false;

    if (this.pointerDown) {
      const dx = this.currentX - this.originX;
      const dy = this.currentY - this.originY;
      const dist = Math.hypot(dx, dy);
      if (dist > JOYSTICK_DEADZONE) {
        const clamped = Math.min(1, (dist - JOYSTICK_DEADZONE) / (JOYSTICK_MAX_RADIUS - JOYSTICK_DEADZONE));
        mx = (dx / dist) * clamped;
        my = (dy / dist) * clamped;
        isMoving = clamped > 0.08;
      }
    }

    return {
      moveX: mx,
      moveY: my,
      isMoving,
      wantsStillpoint: this.hasInteracted && !this.pointerDown,
      hasInteracted: this.hasInteracted,
      joystickActive: this.pointerDown,
      joyOriginX: this.originX,
      joyOriginY: this.originY,
      joyCurrentX: this.currentX,
      joyCurrentY: this.currentY,
      mode: 'touch'
    };
  }
}
