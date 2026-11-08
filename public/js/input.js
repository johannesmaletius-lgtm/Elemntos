// Eingabe: Tastatur + Touch (virtueller Stick links, Knoepfe rechts).
// Stick: leicht drücken = gehen, weit drücken = rennen.

export class Input {
  constructor(root) {
    this.keys = new Set();
    this.state = { axis: 0, run: false, jump: false, ability: false, down: false, jumpPressed: false, abilityPressed: false };
    this._prevJump = false; this._prevAbility = false;
    this._pendingJump = false; this._pendingAbility = false;
    this.touch = { stickId: null, cx: 0, cy: 0, dx: 0, dy: 0, jumpIds: new Set(), abilityIds: new Set() };
    this.enabled = true;
    this.root = root;
    this._bindKeys();
    this._bindTouch(root);
  }

  _bindKeys() {
    const block = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (block.has(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) {
        if (['Space', 'ArrowUp', 'KeyW', 'KeyZ', 'KeyK'].includes(e.code)) this._pendingJump = true;
        if (['KeyE', 'KeyJ', 'KeyX', 'KeyC', 'ControlLeft'].includes(e.code)) this._pendingAbility = true;
      }
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  _bindTouch(root) {
    const stickZone = root.querySelector('#stick-zone');
    const stick = root.querySelector('#stick');
    const knob = root.querySelector('#stick-knob');
    const btnJump = root.querySelector('#btn-jump');
    const btnAbility = root.querySelector('#btn-ability');
    this.ui = { stick, knob, btnJump, btnAbility };
    const R = () => Math.min(70, Math.max(46, window.innerHeight * 0.12));
    const updateKnob = () => {
      const r = R();
      const t = this.touch;
      const d = Math.hypot(t.dx, t.dy);
      const k = d > r ? r / d : 1;
      knob.style.transform = `translate(${t.dx * k}px, ${t.dy * k}px)`;
    };
    stickZone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.touch.stickId !== null) return;
      stickZone.setPointerCapture(e.pointerId);
      this.touch.stickId = e.pointerId;
      this.touch.cx = e.clientX; this.touch.cy = e.clientY;
      this.touch.dx = 0; this.touch.dy = 0;
      stick.style.left = `${e.clientX}px`; stick.style.top = `${e.clientY}px`;
      stick.classList.add('active');
      updateKnob();
    });
    stickZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.touch.stickId) return;
      e.preventDefault();
      const r = R();
      let dx = e.clientX - this.touch.cx, dy = e.clientY - this.touch.cy;
      // Stick folgt dem Finger, wenn er weit wegzieht
      const d = Math.hypot(dx, dy);
      if (d > r * 1.6) {
        const k = (d - r * 1.6) / d;
        this.touch.cx += dx * k; this.touch.cy += dy * k;
        dx = e.clientX - this.touch.cx; dy = e.clientY - this.touch.cy;
        stick.style.left = `${this.touch.cx}px`; stick.style.top = `${this.touch.cy}px`;
      }
      this.touch.dx = dx; this.touch.dy = dy;
      updateKnob();
    });
    const endStick = (e) => {
      if (e.pointerId !== this.touch.stickId) return;
      this.touch.stickId = null; this.touch.dx = 0; this.touch.dy = 0;
      stick.classList.remove('active');
      updateKnob();
    };
    stickZone.addEventListener('pointerup', endStick);
    stickZone.addEventListener('pointercancel', endStick);

    const bindBtn = (el, set, onPress) => {
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        if (set.size === 0) onPress();
        set.add(e.pointerId);
        el.classList.add('pressed');
      });
      const up = (e) => {
        set.delete(e.pointerId);
        if (set.size === 0) el.classList.remove('pressed');
      };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
    };
    bindBtn(btnJump, this.touch.jumpIds, () => { this._pendingJump = true; navigator.vibrate?.(8); });
    bindBtn(btnAbility, this.touch.abilityIds, () => { this._pendingAbility = true; navigator.vibrate?.(12); });
    // Kontextmenue / Zoom verhindern
    root.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  poll() {
    const k = this.keys, s = this.state, t = this.touch;
    if (!this.enabled) {
      s.axis = 0; s.run = false; s.jump = false; s.ability = false; s.jumpPressed = false; s.abilityPressed = false;
      this._pendingJump = this._pendingAbility = false;
      return s;
    }
    let axis = 0;
    if (k.has('ArrowLeft') || k.has('KeyA')) axis -= 1;
    if (k.has('ArrowRight') || k.has('KeyD')) axis += 1;
    let run = k.has('ShiftLeft') || k.has('ShiftRight') || k.has('KeyL');
    const r = Math.min(70, Math.max(46, window.innerHeight * 0.12));
    if (t.stickId !== null) {
      const nx = t.dx / r;
      if (Math.abs(nx) > 0.22) {
        axis = Math.sign(nx);
        if (Math.abs(nx) > 0.78) run = true;
      }
    }
    s.axis = axis;
    s.run = run;
    s.down = k.has('ArrowDown') || k.has('KeyS') || (t.stickId !== null && t.dy / r > 0.6);
    const jump = k.has('Space') || k.has('ArrowUp') || k.has('KeyW') || k.has('KeyZ') || k.has('KeyK') || t.jumpIds.size > 0;
    const ability = k.has('KeyE') || k.has('KeyJ') || k.has('KeyX') || k.has('KeyC') || k.has('ControlLeft') || t.abilityIds.size > 0;
    s.jumpPressed = this._pendingJump;
    s.abilityPressed = this._pendingAbility;
    this._pendingJump = false; this._pendingAbility = false;
    s.jump = jump || s.jumpPressed;
    s.ability = ability || s.abilityPressed;
    return s;
  }
}
