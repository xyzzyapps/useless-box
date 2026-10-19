import * as THREE from 'three';

/**
 * Pointer and keyboard input for the 3D switch. The canvas acts as one large
 * button; a generous invisible hit volume covers the toggle and its plate.
 */
export class InputController {
  constructor({
    canvas,
    camera,
    hitTargets,
    onActivate,
    onHoverChange = null,
    onFirstGesture = null,
    logger = null,
  }) {
    this.canvas = canvas;
    this.camera = camera;
    this.hitTargets = hitTargets;
    this.onActivate = onActivate;
    this.onHoverChange = onHoverChange;
    this.onFirstGesture = onFirstGesture;
    this.logger = logger;
    this.enabled = true;
    this.hovered = false;
    this.pointerInside = false;
    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();

    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerLeave = this._onPointerLeave.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onFocus = this._onFocus.bind(this);
    this._onBlur = this._onBlur.bind(this);

    canvas.addEventListener('pointermove', this._onPointerMove, { passive: true });
    canvas.addEventListener('pointerdown', this._onPointerDown, { passive: false });
    canvas.addEventListener('pointerleave', this._onPointerLeave, { passive: true });
    canvas.addEventListener('pointercancel', this._onPointerLeave, { passive: true });
    canvas.addEventListener('keydown', this._onKeyDown);
    canvas.addEventListener('focus', this._onFocus);
    canvas.addEventListener('blur', this._onBlur);
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) this._setHovered(false);
  }

  refreshHover() {
    if (this.pointerInside) this._updateHover();
  }

  dispose() {
    const canvas = this.canvas;
    canvas.removeEventListener('pointermove', this._onPointerMove);
    canvas.removeEventListener('pointerdown', this._onPointerDown);
    canvas.removeEventListener('pointerleave', this._onPointerLeave);
    canvas.removeEventListener('pointercancel', this._onPointerLeave);
    canvas.removeEventListener('keydown', this._onKeyDown);
    canvas.removeEventListener('focus', this._onFocus);
    canvas.removeEventListener('blur', this._onBlur);
  }

  _onPointerMove(event) {
    if (event.pointerType === 'touch') return;
    this.pointerInside = true;
    this._updateNdcFromEvent(event);
    this._updateHover();
  }

  _onPointerDown(event) {
    if (!event.isPrimary) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    this.canvas.focus({ preventScroll: true });
    this._updateNdcFromEvent(event);

    if (typeof this.onFirstGesture === 'function') this.onFirstGesture();
    if (!this.enabled) return;
    if (!this._hitTest()) return;

    event.preventDefault();
    if (typeof this.onActivate === 'function') this.onActivate('pointer');
  }

  _onPointerLeave() {
    this.pointerInside = false;
    this._setHovered(false);
  }

  _onFocus() {
    this._setHovered(true);
  }

  _onBlur() {
    this._setHovered(false);
  }

  _onKeyDown(event) {
    if (event.code !== 'Space' && event.code !== 'Enter' && event.code !== 'NumpadEnter') {
      return;
    }
    if (!this.enabled) return;
    event.preventDefault();
    if (typeof this.onFirstGesture === 'function') this.onFirstGesture();
    if (typeof this.onActivate === 'function') this.onActivate('keyboard');
  }

  _updateNdcFromEvent(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    const y = -((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
    this.ndc.set(x, y);
  }

  _updateHover() {
    if (!this.enabled) {
      this._setHovered(false);
      return;
    }
    this._setHovered(this._hitTest());
  }

  _hitTest() {
    this.raycaster.setFromCamera(this.ndc, this.camera);
    return this.raycaster.intersectObjects(this.hitTargets, true).length > 0;
  }

  _setHovered(hovered) {
    if (this.hovered === hovered) return;
    this.hovered = hovered;
    this.canvas.classList.toggle('is-hovering', hovered);
    if (typeof this.onHoverChange === 'function') this.onHoverChange(hovered);
    this.logger?.debug('switch hover', hovered);
  }
}
