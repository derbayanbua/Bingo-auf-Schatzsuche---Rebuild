// GS032-02 Wassermaschine (Rube-Goldberg machine) – port of the local Lingo dec/Game/GS032-02
// (behaviours 3..23, one per sprite). Every behaviour keeps its own state and millisecond gate; the
// prepareFrame handlers run in channel order like in Director.
//
// Chain: Hauptschalter (16) on -> sendSprite(random(11,14), #startPumping); a rotor pumps 10 s and then
// hands over to rotor 10+random(4). Wahlhebel (15) selects rotor 1..4 (frames 1/3/5/7, pendulum).
// Handrad 1 (21) open + selected rotor pumping -> water (23, blend 100) -> Schaufelrad (22), rotor 5
// (24): Fill2 (53) full -> Fill2 down, Fill1 (54) up. Handrad 2 (31) open + pumping -> Zünder (32)
// burns down -> Kanonenkugel (33) fires. Handrad 3 (41) open + Handrad 4 (42) closed -> Stopper (44)
// released (41 closed + 42 open -> loaded again). Eimer (43): pumping + 41 + 42 open + at the top ->
// closes 42, goes down, starts the Blasebalg (45); at frame 15 with released stopper it tilts into
// Fill2 (53 forward). Handkurbel (35) click -> Eimerkette (36) -> Blasebalg full; Blasebalg frame 10
// while full -> Blase (46) grows (frame 8: Handpumpe 48 forward, Glocke 49 up); the cannon ball hits
// the bubble -> bursts, 48 back, 49 down. Handpumpe at its end with Fill1 full -> Pool (52) +1, Fill1
// back. Pool 7 -> writeData("AS035-01", "WATER", #activ), Game-Ready.
//
// [Prüfung erforderlich] startMovie sets the misspelled local gGameBackScreen, so Taster Stop goes to
// whatever gGameBackMovie a previous game screen left (normally AS032-02 from GS032-01); AS032-02 here.
// [Prüfung erforderlich] sprites 101/102 (Glas-n, water level glasses) lie in the interface bar and are
// not shown (Stand1/Stand2 show the same level).

import { registerOrigScene, type OrigScene } from '../sceneView';
import type { Sprite } from '../stage';
import { gameScreen, intersects, markPorted, memberNum, movieLoops, random, rnd, writeCI } from './ch3a-util';

type Mode = string;

registerOrigScene('GS032-02', (scene) => {
  markPorted(scene);
  let stop: (() => void) | null = null;
  const ui = gameScreen(scene, 'AS032-02', () => {
    stop = machine(scene, () => ui.ready());
  });
  return () => {
    stop?.();
    ui.cleanup();
  };
});

function machine(scene: OrigScene, ready: () => void): () => void {
  const has = (ch: number) => scene.stage.has(ch);
  const sp = (ch: number): Sprite => scene.sprite(ch);
  const snd = (name: string) => void scene.sound(name, 100);
  const frameOf = (ch: number) => memberNum(sp(ch))[1];
  const show = (ch: number, n: number) => {
    const [base] = memberNum(sp(ch));
    sp(ch).setMember(`${base}-${n}`);
  };
  movieLoops(scene, [23]);

  // ---------------------------------------------------------------- behaviour state
  const rotor = new Map<number, { mode: Mode; frame: number; stopAt: number; upd: number }>();
  for (const ch of [11, 12, 13, 14]) rotor.set(ch, { mode: 'stopped', frame: 0, stopAt: 0, upd: 0 });
  const startPumping = (ch: number, now: number) => {
    const r = rotor.get(ch);
    if (!r) return;
    r.stopAt = now + 10000;
    r.mode = 'pumping';
  };
  const wahl = { ms: 0, frame: 1, dir: 1, mode: 'stopped' as Mode, state: 1 };
  const haupt = { state: 'off', mode: 'stopped' as Mode, upd: 0 };
  const rad = new Map<number, { state: 'closed' | 'opened'; mode: Mode; upd: number }>();
  for (const ch of [21, 31, 41, 42]) rad.set(ch, { state: 'closed', mode: 'stopped', upd: 0 });
  const radState = (ch: number) => rad.get(ch)!.state;
  const selPumping = () => rotor.get(10 + wahl.state)?.mode === 'pumping';
  const schaufel = { upd: 0 };
  const rotor5 = { frame: 0, upd: 0 };
  const zuender = { state: 'base', mode: 'stopped' as Mode, upd: 0 };
  const kugel = { mode: 'stopped' as Mode, startH: has(33) ? sp(33).locH : 0, upd: 0 };
  const kurbel = { mode: 'stopped' as Mode, upd: 0 };
  const kette = { mode: 'stopped' as Mode, upd: 0 };
  const eimer = { state: 'top', mode: 'stopped' as Mode, upd: 0 };
  const stopper = { state: 'loaded', mode: undefined as Mode | undefined, upd: 0 };
  const balg = { mode: undefined as Mode | undefined, fill: 'empty', upd: 0 };
  const blase = { mode: 'stopped' as Mode, startV: has(46) ? sp(46).locV : 0, upd: 0 };
  const pumpe = { state: 'left', mode: 'stopped' as Mode, upd: 0 };
  const glocke = { mode: 'stopped' as Mode, state: 'bottom', startV: has(49) ? sp(49).locV : 0, upd: 0 };
  const fill = new Map<number, { state: string; mode: Mode | undefined; upd: number }>();
  for (const ch of [53, 54]) fill.set(ch, { state: 'empty', mode: undefined, upd: 0 });

  // Pool.addWater
  const addWater = () => {
    let f = frameOf(52);
    if (f >= 7) return;
    f++;
    show(52, f);
    if (has(51)) sp(51).setMember(`Stand1-${f}`);
    if (f === 7) {
      writeCI(scene, 'WATER', 'activ', 'AS035-01');
      ready();
    }
  };

  // ---------------------------------------------------------------- clicks
  const clickable = (ch: number, ev: 'mouseDown' | 'mouseUp', fn: () => void) => {
    if (!has(ch)) return;
    sp(ch).cursor = 'make';
    scene.on(ch, ev, () => {
      if (scene.busy) return;
      fn();
    });
  };
  // Wahlhebel.mouseDown
  clickable(15, 'mouseDown', () => {
    snd('Hebel-02');
    wahl.mode = 'switch';
  });
  // Hauptschalter.mouseUp
  clickable(16, 'mouseUp', () => {
    if (haupt.mode === 'stopped' && haupt.state === 'off') {
      haupt.mode = 'forward';
      snd('Hebel-01');
    } else if (haupt.mode === 'stopped' && haupt.state === 'on') {
      haupt.mode = 'backward';
      snd('Hebel-02');
    }
  });
  // Handrad 1..4.mouseUp
  for (const ch of [21, 31, 41, 42]) {
    clickable(ch, 'mouseUp', () => {
      const r = rad.get(ch)!;
      if (r.state === 'closed') {
        r.mode = 'open';
        snd('Rad-01');
      } else if (r.state === 'opened') {
        r.mode = 'close';
        snd('Rad-02');
      }
    });
  }
  // Handkurbel.mouseUp
  clickable(35, 'mouseUp', () => {
    if (kurbel.mode === 'stopped') {
      kurbel.mode = 'running';
      kette.mode = 'running';
    }
  });

  // ---------------------------------------------------------------- prepareFrame (channel order)
  const step: [number, (now: number) => void][] = [];
  // 11..14 Pumpenrotor 1-4
  for (const ch of [11, 12, 13, 14]) {
    step.push([ch, (now) => {
      const r = rotor.get(ch)!;
      if (now < r.upd || r.mode === 'stopped') return;
      if (r.mode === 'pumping') {
        r.frame = r.frame < 5 ? r.frame + 1 : 1;
        sp(ch).setMember(`Rotor-${r.frame}`);
      }
      if (now > r.stopAt) {
        r.mode = 'stopped';
        startPumping(10 + random(4), now);
      }
      r.upd = now + 40;
    }]);
  }
  // 15 Wahlhebel
  step.push([15, (now) => {
    if (now < wahl.ms + 40 || wahl.mode !== 'switch') return;
    wahl.frame += wahl.dir;
    sp(15).setMember(`Wahl-${wahl.frame}`);
    if (wahl.frame === 1) wahl.dir = 1;
    if (wahl.frame === 7) wahl.dir = -1;
    if ([1, 3, 5, 7].includes(wahl.frame)) {
      wahl.mode = 'stopped';
      wahl.state = (wahl.frame + 1) / 2;
    }
    wahl.ms = now;
  }]);
  // 16 Hauptschalter
  step.push([16, (now) => {
    if (now < haupt.upd) return;
    if (haupt.mode === 'forward') {
      const f = frameOf(16);
      if (f < 6) show(16, f + 1);
      else {
        haupt.mode = 'stopped';
        haupt.state = 'on';
        startPumping(rnd(11, 14), now);
      }
    }
    if (haupt.mode === 'backward') {
      const f = frameOf(16);
      if (f > 1) show(16, f - 1);
      else {
        haupt.mode = 'stopped';
        haupt.state = 'off';
        for (const r of rotor.values()) r.mode = 'stopped';
      }
    }
    haupt.upd = now + 40;
  }]);
  // Handrad open/close animation (Hand-1..7)
  const radUpdate = (ch: number, now: number) => {
    const r = rad.get(ch)!;
    if (r.mode === 'open') {
      const f = frameOf(ch);
      if (f < 7) show(ch, f + 1);
      else {
        r.mode = 'stopped';
        r.state = 'opened';
      }
    }
    if (r.mode === 'close') {
      const f = frameOf(ch);
      if (f > 1) show(ch, f - 1);
      else {
        r.mode = 'stopped';
        r.state = 'closed';
      }
    }
    r.upd = now + 40;
  };
  // 21 Handrad 1: water wheel
  step.push([21, (now) => {
    if (now < rad.get(21)!.upd) return;
    radUpdate(21, now);
    if (!has(23)) return;
    if (radState(21) === 'closed') sp(23).blend = 0;
    else sp(23).blend = selPumping() ? 100 : 0;
  }]);
  // 22 Schaufelrad
  step.push([22, (now) => {
    if (now < schaufel.upd || !has(23) || sp(23).blend === 0) return;
    const f = frameOf(22);
    show(22, f > 1 ? f - 1 : 5);
    schaufel.upd = now + 20;
  }]);
  // 24 Pumpenrotor 5
  step.push([24, (now) => {
    if (now < rotor5.upd || !has(23) || sp(23).blend === 0) return;
    rotor5.frame = rotor5.frame < 5 ? rotor5.frame + 1 : 1;
    const f2 = fill.get(53)!;
    if (f2.state === 'full') {
      f2.mode = 'backward';
      fill.get(54)!.mode = 'forward';
    }
    sp(24).setMember(`Rotor-${rotor5.frame}`);
    rotor5.upd = now + 40;
  }]);
  // 31 Handrad 2: fuse
  step.push([31, (now) => {
    if (now < rad.get(31)!.upd) return;
    radUpdate(31, now);
    if (radState(31) === 'closed') {
      if (has(32)) sp(32).setMember('Zuender-1');
      zuender.state = 'base';
      return;
    }
    if (selPumping()) {
      if (zuender.state === 'base') zuender.mode = 'forward';
    } else {
      if (has(32)) sp(32).setMember('Zuender-1');
      zuender.state = 'base';
    }
  }]);
  // 32 Zuender
  step.push([32, (now) => {
    if (now < zuender.upd || zuender.mode === 'stopped') return;
    if (zuender.mode === 'forward') {
      const f = frameOf(32);
      if (f < 16) show(32, f + 1);
      else {
        zuender.mode = 'stopped';
        zuender.state = 'ignition';
        // Kanonenkugel.fire
        snd('Fire');
        if (has(33)) sp(33).blend = 100;
        kugel.mode = 'fire';
      }
    }
    if (zuender.mode === 'backward') {
      const f = frameOf(32);
      if (f > 1) show(32, f - 1);
      else {
        zuender.mode = 'stopped';
        zuender.state = 'base';
      }
    }
    zuender.upd = now + 40;
  }]);
  // 33 Kanonenkugel
  step.push([33, (now) => {
    if (now < kugel.upd || !has(33)) return;
    if (kugel.mode === 'fire') {
      const k = sp(33);
      k.setLoc(k.locH + 20, k.locV);
      if (k.locH > 850) {
        k.blend = 0;
        k.setLoc(kugel.startH, k.locV);
        kugel.mode = 'stopped';
      }
    }
    kugel.upd = now + 20;
  }]);
  // 35 Handkurbel
  step.push([35, (now) => {
    if (now < kurbel.upd || kurbel.mode === 'stopped') return;
    if (kurbel.mode === 'running') {
      let f = frameOf(35);
      if (f < 12) f++;
      else {
        f = 1;
        kurbel.mode = 'stopped';
      }
      show(35, f);
    }
    kurbel.upd = now + 40;
  }]);
  // 36 Eimerkette
  step.push([36, (now) => {
    if (now < kette.upd || kette.mode === 'stopped') return;
    if (kette.mode === 'running') {
      let f = frameOf(36);
      if (f < 20) {
        f++;
        if (f === 12) snd('Schwall');
      } else {
        f = 1;
        kette.mode = 'stopped';
        balg.fill = 'full';
      }
      show(36, f);
    }
    kette.upd = now + 40;
  }]);
  // 41 / 42 Handrad 3 / 4
  for (const ch of [41, 42]) {
    step.push([ch, (now) => {
      if (now < rad.get(ch)!.upd) return;
      radUpdate(ch, now);
    }]);
  }
  // 43 Eimer
  let eimerHold = false; // the Lingo exits before myUpdateTime is set -> runs again next frame
  step.push([43, (now) => {
    if (now < eimer.upd && !eimerHold) return;
    eimerHold = false;
    let skip = false;
    if (eimer.mode === 'movedown') {
      const f = frameOf(43);
      if (f === 15 && stopper.state === 'released') {
        fill.get(53)!.mode = 'forward';
        eimer.mode = 'tilt';
        sp(43).setMember('Eimer2-1');
        skip = true;
      } else if (f < 21) show(43, f + 1);
      else eimer.mode = 'moveup';
    }
    if (!skip && eimer.mode === 'tilt') {
      const f = frameOf(43);
      if (f < 11) show(43, f + 1);
      else {
        eimer.mode = 'moveup';
        sp(43).setMember('Eimer1-15');
        skip = true;
      }
    }
    if (!skip && eimer.mode === 'moveup') {
      const f = frameOf(43);
      if (f > 1) show(43, f - 1);
      else {
        eimer.mode = 'stopped';
        eimer.state = 'top';
      }
    }
    if (skip) eimerHold = true;
    else eimer.upd = now + 40;
    // prepareFrame part 2
    if (selPumping() && radState(41) === 'opened' && radState(42) === 'opened' && eimer.mode === 'stopped' && eimer.state === 'top') {
      snd('Eimer-01');
      rad.get(42)!.mode = 'close';
      eimer.mode = 'movedown';
      balg.mode = 'pumping';
    }
  }]);
  // 44 Stopper
  step.push([44, (now) => {
    if (now < stopper.upd) return;
    if (stopper.mode !== 'stopped') {
      if (stopper.mode === 'release') {
        const f = frameOf(44);
        if (f < 16) show(44, f + 1);
        else {
          stopper.mode = 'stopped';
          stopper.state = 'released';
        }
      }
      stopper.upd = now + 40;
    }
    if (radState(41) === 'opened' && radState(42) === 'closed' && stopper.state === 'loaded') {
      snd('Stopper-02');
      stopper.mode = 'release';
    }
    if (radState(41) === 'closed' && radState(42) === 'opened' && stopper.state === 'released') {
      snd('Stopper-01');
      stopper.state = 'loaded';
      sp(44).setMember('Stopper-1');
    }
  }]);
  // 45 Blasebalg
  step.push([45, (now) => {
    if (now < balg.upd || balg.mode === 'stopped') return;
    if (balg.mode === 'pumping') {
      let f = frameOf(45);
      if (f < 20) {
        f++;
        show(45, f);
      } else {
        sp(45).setMember('Nocken-1');
        balg.mode = 'stopped';
      }
      if (f === 10 && balg.fill === 'full') {
        if (blase.mode === 'stopped') blase.mode = 'growing';
        balg.fill = 'empty';
      }
    }
    balg.upd = now + 40;
  }]);
  // 46 Blase
  step.push([46, (now) => {
    if (now < blase.upd || blase.mode === 'stopped') return;
    const b = sp(46);
    if (blase.mode === 'growing') {
      const f = frameOf(46) + 1;
      show(46, f);
      b.setLoc(b.locH, b.locV - 7);
      if (f === 11) blase.mode = 'waiting';
      if (f === 8) {
        pumpe.mode = 'forward';
        glocke.mode = 'moveup';
      }
    }
    if (blase.mode === 'waiting' && has(33) && intersects(sp(33), b)) {
      snd('Blase');
      pumpe.mode = 'backward';
      glocke.mode = 'movedown';
      blase.mode = 'exploding';
    }
    if (blase.mode === 'exploding') {
      const f = frameOf(46) + 1;
      show(46, f);
      if (f === 18) {
        b.setMember('Blase-1');
        b.setLoc(b.locH, blase.startV);
        blase.mode = 'stopped';
      }
    }
    blase.upd = now + 20;
  }]);
  // 48 Handpumpe
  step.push([48, (now) => {
    if (now < pumpe.upd || pumpe.mode === 'stopped') return;
    if (pumpe.mode === 'forward') {
      const f = frameOf(48);
      if (f < 11) show(48, f + 1);
      else {
        const f1 = fill.get(54)!;
        if (f1.state === 'full') {
          addWater();
          f1.mode = 'backward';
        }
        pumpe.mode = 'stopped';
        pumpe.state = 'right';
      }
    }
    if (pumpe.mode === 'backward') {
      const f = frameOf(48);
      if (f > 1) show(48, f - 1);
      else {
        pumpe.mode = 'stopped';
        pumpe.state = 'left';
      }
    }
    pumpe.upd = now + 40;
  }]);
  // 49 Glocke (Zahnstange)
  step.push([49, (now) => {
    if (now < glocke.upd || glocke.mode === 'stopped') return;
    const g = sp(49);
    if (glocke.mode === 'moveup') g.setLoc(g.locH, g.locV - 7);
    if (glocke.mode === 'movedown') g.setLoc(g.locH, g.locV + 7);
    if (g.locV === glocke.startV) {
      glocke.state = 'bottom';
      glocke.mode = 'stopped';
    }
    if (g.locV === glocke.startV - 28) {
      glocke.state = 'top';
      glocke.mode = 'stopped';
    }
    glocke.upd = now + 40;
  }]);
  // 53 / 54 Wasserstand (Fill2 / Fill1)
  for (const ch of [53, 54]) {
    step.push([ch, (now) => {
      const w = fill.get(ch)!;
      if (now < w.upd || w.mode === 'stopped') return;
      if (w.mode === 'forward') {
        const f = frameOf(ch);
        if (f < 6) show(ch, f + 1);
        else {
          w.state = 'full';
          w.mode = 'stopped';
        }
      }
      if (w.mode === 'backward') {
        const f = frameOf(ch);
        if (f > 1) show(ch, f - 1);
        else {
          w.state = 'empty';
          w.mode = 'stopped';
        }
      }
      w.upd = now + 40;
    }]);
  }
  step.sort((a, b) => a[0] - b[0]);
  const off = scene.onTick((now) => {
    for (const [ch, f] of step) {
      if (!has(ch)) continue;
      f(now);
      if (!scene.alive) return;
    }
  });
  return off;
}
