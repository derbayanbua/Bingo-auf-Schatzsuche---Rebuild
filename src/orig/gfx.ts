// Optional original graphics (private use). Exported by tools/export_graphics.py into
// public/orig/gfx/ (gitignored). Everything here degrades gracefully: without the folder
// hasOriginalGfx() is false and the game uses its own vector art.

/** [w, h, regX, regY, name] per member number */
export type MemberInfo = [number, number, number, number, string];
export type GfxIndex = Record<string, Record<string, MemberInfo>>;

const BASE = `${import.meta.env?.BASE_URL ?? './'}orig/gfx/`.replace(/\/\/+/g, '/');
let index: GfxIndex | null = null;
let loading: Promise<GfxIndex | null> | null = null;

/** Fetch gfx/index.json once (null if the originals are not installed). */
export function loadGfxIndex(): Promise<GfxIndex | null> {
  if (index) return Promise.resolve(index);
  if (!loading) {
    loading = (typeof fetch === 'function' ? fetch(BASE + 'index.json') : Promise.reject(new Error('no fetch')))
      .then((r) => (r.ok && (r.headers.get('content-type') ?? '').includes('json') ? r.json() : null))
      .then((j: GfxIndex | null) => (index = j && typeof j === 'object' ? j : null))
      .catch(() => null);
  }
  return loading;
}

export function hasOriginalGfx(): boolean {
  return !!index;
}

export function gfxIndex(): GfxIndex | null {
  return index;
}

/** URL of a member bitmap (no existence check). */
export function gfxUrl(dir: string, member: number): string {
  return `${BASE}${dir}/${member}.webp`;
}

export function gfxBase(): string {
  return BASE;
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

/** Original inventory icon (Shared_Inventar OIxxx) or null. */
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
