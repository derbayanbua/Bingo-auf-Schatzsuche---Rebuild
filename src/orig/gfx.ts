// Sprite graphics for the Director-like runtime (stage.ts, boardOrig.ts, sceneView.ts …). Two packs share
// the same layout (index.json: [w,h,regX,regY,name] per member, score/<Dir>_<Movie>.json):
//   * public/assets/gfx/ – the game's own "neue Grafik" (tools/newart, committed, publishable)
//   * public/orig/gfx/   – the original bitmaps (tools/export_graphics.py, gitignored, private use only)
// The originals are used when installed and the setting "Originalgrafik verwenden" is on (default);
// otherwise the new pack. Without either, hasOriginalGfx() is false and the game uses its vector view.

/** [w, h, regX, regY, name] per member number */
export type MemberInfo = [number, number, number, number, string];
export type GfxIndex = Record<string, Record<string, MemberInfo>>;
export type GfxPack = 'orig' | 'new';

const ROOT = `${import.meta.env?.BASE_URL ?? './'}`;
const PACK_BASE: Record<GfxPack, string> = {
  orig: `${ROOT}orig/gfx/`.replace(/\/\/+/g, '/'),
  new: `${ROOT}assets/gfx/`.replace(/\/\/+/g, '/'),
};
const PREF_KEY = 'bingo-schatzsuche.gfxPack';

let index: GfxIndex | null = null;
let pack: GfxPack | null = null;
let origInstalled = false;
/** new pack: members with art per movie dir ([art, total]) – movies without full coverage show placeholders */
let coverage: Record<string, [number, number]> | null = null;
let loading: Promise<GfxIndex | null> | null = null;

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return null;
    const j = (await r.json()) as T;
    return j && typeof j === 'object' ? j : null;
  } catch {
    return null;
  }
}

/** user preference: 'orig' (default, only effective when installed) or 'new' */
export function preferredGfxPack(): GfxPack {
  try {
    return localStorage.getItem(PREF_KEY) === 'new' ? 'new' : 'orig';
  } catch {
    return 'orig';
  }
}

/** store the preference (takes effect after a reload – caches and running stages keep their pack) */
export function setPreferredGfxPack(p: GfxPack): void {
  try {
    localStorage.setItem(PREF_KEY, p);
  } catch {
    /* private mode: ignore */
  }
}

/** Fetch the index of the active pack once (null if no pack is available). */
export function loadGfxIndex(): Promise<GfxIndex | null> {
  if (index) return Promise.resolve(index);
  if (!loading) {
    loading = (async () => {
      if (typeof fetch !== 'function') return null;
      const orig = await fetchJson<GfxIndex>(PACK_BASE.orig + 'index.json');
      origInstalled = !!orig;
      if (orig && preferredGfxPack() === 'orig') {
        pack = 'orig';
        return (index = orig);
      }
      const [n, cov] = await Promise.all([fetchJson<GfxIndex>(PACK_BASE.new + 'index.json'), fetchJson<Record<string, [number, number]>>(PACK_BASE.new + 'coverage.json')]);
      if (n) {
        pack = 'new';
        coverage = cov;
        return (index = n);
      }
      if (orig) {
        pack = 'orig';
        return (index = orig);
      }
      return null;
    })();
  }
  return loading;
}

/** true when a sprite pack (original or new) is active – the sprite runtime is used then */
export function hasOriginalGfx(): boolean {
  return !!index;
}

/** active pack ('orig' | 'new') or null */
export function gfxPack(): GfxPack | null {
  return pack;
}

/** the original graphics are installed (public/orig/gfx) – whether active or not */
export function hasOrigGfxInstalled(): boolean {
  return origInstalled;
}

/**
 * true if a movie can be shown completely with the active pack (originals: always; new pack: every
 * member of the movie has new art). Used for optional full screens (chapter cards, intro).
 */
export function hasMovieArt(id: string): boolean {
  if (!index) return false;
  if (pack === 'orig') return true;
  const c = coverage?.[movieDir(id)];
  return !!c && c[0] >= c[1] && c[1] > 0;
}

export function gfxIndex(): GfxIndex | null {
  return index;
}

/** URL of a member bitmap (no existence check). */
export function gfxUrl(dir: string, member: number): string {
  return `${gfxBase()}${dir}/${member}.webp`;
}

export function gfxBase(): string {
  return PACK_BASE[pack ?? 'orig'];
}

/** 'AS001-01' -> 'Adventure_AS001-01', 'GS016-01' -> 'Game_GS016-01', 'SP001' -> 'Landscape_SP001'. */
export function movieDir(id: string): string {
  if (id.includes('_')) return id;
  if (id.startsWith('AS')) return `Adventure_${id}`;
  if (id.startsWith('GS')) return `Game_${id}`;
  if (id.startsWith('SP')) return `Landscape_${id}`;
  if (/^Chapter/.test(id)) return `Chapter_${id}`;
  if (id === 'Exchange') return 'Exchange_Exchange';
  if (id === 'Intro') return 'Intro_Intro';
  return `Interface_${id}`;
}

let inventarByName: Map<string, number> | null = null;

/** Inventory icon of the active pack (Shared_Inventar OIxxx) or null. */
export function itemImageUrl(id: string): string | null {
  if (!index || id === 'OI000') return null;
  if (!inventarByName) {
    inventarByName = new Map();
    for (const [m, info] of Object.entries(index['Shared_Inventar'] ?? {})) {
      if (!inventarByName.has(info[4])) inventarByName.set(info[4], +m);
    }
  }
  const m = inventarByName.get(id);
  return m ? gfxUrl('Shared_Inventar', m) : null;
}

/** CSS cursor for the original cursor types (#make, #take, #grab, #talk, #look, #wait, #walk). */
export function cursorCss(type: string | null | undefined, ch: 'CH1' | 'CH2' = 'CH1'): string {
  const fallback: Record<string, string> = { make: 'pointer', take: 'grab', grab: 'grabbing', talk: 'pointer', look: 'zoom-in', wait: 'wait', walk: 'pointer' };
  if (!type) return 'default';
  const t = type.replace(/^#/, '').toLowerCase();
  const name = t === 'walk' ? (ch === 'CH2' ? 'WalkPuck' : 'WalkBingo') : t[0].toUpperCase() + t.slice(1);
  const lib = index?.['Shared_Interface'];
  if (lib) {
    for (const [m, info] of Object.entries(lib)) {
      if (info[4] === name) {
        const hx = Math.max(0, Math.min(info[0] - 1, info[2]));
        const hy = Math.max(0, Math.min(info[1] - 1, info[3]));
        return `url("${gfxUrl('Shared_Interface', +m)}") ${hx} ${hy}, ${fallback[t] ?? 'pointer'}`;
      }
    }
  }
  return fallback[t] ?? 'pointer';
}
