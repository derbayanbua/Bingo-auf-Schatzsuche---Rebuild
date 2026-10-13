// Witzomat AS006-01/02 and AS048-01/02 (identical local Lingo, different graphics).
// AS0xx-01: Hotspot Witzomat (sprite 11) -> gTargetMovie AS0xx-02 WITHOUT setCharacterScreen.
// AS0xx-02: framescript (Message sprite 13), Hebel (11), Kartenschacht (12).

import { registerOrigScene, type OrigScene } from '../sceneView';
import { inventarSound, markPorted, showInventar, showMovie } from './ch1util';

function outside(target: string) {
  return (scene: OrigScene) => {
    markPorted(scene);
    const HS = 11;
    scene.off(HS);
    const sp = scene.sprite(HS);
    const state = () => scene.state.get('HS1') ?? 'activ';
    sp.cursor = 'look';
    scene.on(HS, 'mouseWithin', () => {
      sp.cursor = state() === 'passiv' ? 'make' : 'look';
    });
    scene.on(HS, 'mouseUp', () => {
      if (state() === 'passiv' || scene.busy || scene.hand) return;
      showMovie(scene, target);
    });
  };
}

function machine(scene: OrigScene) {
  markPorted(scene);
  const HEBEL = 11, KLAPPE = 12, MESSAGE = 13;
  const s = scene.ctx.s;
  // original: getJokes(#CH1)+getJokes(#CH2) – getJokes ignores its argument and reads the current
  // character twice, so the machine is "voll" at 5 jokes of the current character (quirk kept).
  const full = () => s.chars[scene.ctx.ch].jokes * 2 >= 10;
  // Hotspot-AS 14 and 15 share pId 1 (HS1); the generic view only binds the last channel -> bind 14 too
  // [shared: sceneView keyToCh keeps one channel per key]
  if (scene.stage.has(14)) {
    scene.sprite(14).cursor = 'walk';
    scene.on(14, 'mouseUp', () => {
      if (scene.busy || scene.hand) return;
      const o = scene.object('HS1');
      if (o?.to && (scene.state.get('HS1') ?? 'activ') !== 'passiv') scene.goto(o.to);
    });
  }
  const msg = scene.sprite(MESSAGE);
  scene.onTick(() => {
    msg.visible = full();
  });
  msg.visible = full();

  const seq = (ch: number) => {
    const sp = scene.sprite(ch);
    const b = sp.behavior(ch === HEBEL ? 'Hebel' : 'Kartenschacht')?.params ?? {};
    const first = scene.movie.memberAt(b.pFirstMember?.castLib || 1, b.pFirstMember?.member);
    const last = scene.movie.memberAt(b.pLastMember?.castLib || 1, b.pLastMember?.member);
    const base = /^(.*)-\d+$/.exec(last?.name ?? '')?.[1] ?? (ch === HEBEL ? 'Hebel' : 'Klappe');
    return {
      sp,
      base,
      first: +(/-(\d+)$/.exec(first?.name ?? '')?.[1] ?? 1),
      last: +(/-(\d+)$/.exec(last?.name ?? '')?.[1] ?? 1),
      wait: 1000 / (+b.pFrameRate || 25),
    };
  };
  const hebel = { ...seq(HEBEL), mode: 'stopped' as 'stopped' | 'forward' | 'backward', frame: 1, t: 0 };
  const klappe = { ...seq(KLAPPE), mode: 'stopped' as 'stopped' | 'forward' | 'backward', frame: 1, t: 0 };
  hebel.frame = hebel.first;
  klappe.frame = klappe.first;
  const show = (o: typeof hebel) => o.sp.setMember(`${o.base}-${o.frame}`);

  scene.onTick((now) => {
    // Hebel.updateSprite
    if (hebel.mode !== 'stopped' && now >= hebel.t + hebel.wait) {
      if (hebel.mode === 'forward') {
        hebel.frame++;
        if (hebel.frame === hebel.last + 1) hebel.frame = hebel.first;
        show(hebel);
        if (hebel.frame === 6) {
          hebel.mode = 'stopped';
          if (klappe.sp.member?.name === `${klappe.base}-1`) klappe.mode = 'forward';
        }
      } else {
        hebel.frame--;
        if (hebel.frame === hebel.first - 1) hebel.frame = hebel.last;
        show(hebel);
        if (hebel.frame === 1) hebel.mode = 'stopped';
      }
      hebel.t = now;
    }
    // Kartenschacht.updateSprite
    if (klappe.mode !== 'stopped' && now >= klappe.t + klappe.wait) {
      if (klappe.mode === 'forward') {
        klappe.frame++;
        if (klappe.frame === klappe.last + 1) klappe.frame = klappe.first;
        show(klappe);
        if (klappe.frame === 6 || klappe.frame === 11) klappe.mode = 'stopped';
        if (klappe.frame === 16) {
          klappe.mode = 'stopped';
          klappe.frame = 1;
          show(klappe);
        }
      } else {
        klappe.frame--;
        if (klappe.frame === klappe.first - 1) klappe.frame = klappe.last;
        show(klappe);
      }
      klappe.t = now;
    }
  });

  // Hebel: mouseDown -> Switch-1, forward; mouseUp / mouseUpOutside -> Switch-2, backward
  let leverDown = false;
  const blocked = () => scene.busy || !!scene.hand || full();
  hebel.sp.cursor = 'make';
  scene.on(HEBEL, 'mouseDown', () => {
    if (blocked()) return;
    leverDown = true;
    void scene.sound('Switch-1', 100);
    hebel.mode = 'forward';
  });
  const release = () => {
    if (!leverDown) return;
    leverDown = false;
    if (blocked()) return;
    void scene.sound('Switch-2', 100);
    hebel.mode = 'backward';
  };
  const onUpAnywhere = () => release();
  window.addEventListener('pointerup', onUpAnywhere);
  window.addEventListener('pointercancel', onUpAnywhere);

  // Kartenschacht: click at frame 6 -> card comes out (frame 11); mouseDown at 11 -> card taken
  scene.on(KLAPPE, 'mouseWithin', () => {
    klappe.sp.cursor = klappe.frame === 11 ? 'take' : 'make';
  });
  scene.on(KLAPPE, 'mouseUp', () => {
    if (scene.busy || scene.hand) return;
    if (klappe.frame === 6) klappe.mode = 'forward';
  });
  scene.on(KLAPPE, 'mouseDown', () => {
    if (scene.busy || scene.hand) return;
    if (klappe.frame === 11) {
      // original: OI006 goes into the hand (source 0) and is dropped onto "Drop Jokes" (addJokes(1)).
      // Touch port: the card goes straight onto the joke pile. [Prüfung erforderlich: dropping it
      // anywhere else loses the card in the original]
      scene.ctx.addJokes(1);
      inventarSound('OI006');
      showInventar();
      klappe.mode = 'forward';
    }
  });
  return () => {
    window.removeEventListener('pointerup', onUpAnywhere);
    window.removeEventListener('pointercancel', onUpAnywhere);
  };
}

registerOrigScene('AS006-01', outside('AS006-02'));
registerOrigScene('AS048-01', outside('AS048-02'));
registerOrigScene('AS006-02', machine);
registerOrigScene('AS048-02', machine);
