// Original media (imported privately by tools/import_original_assets.py into public/orig/).
// Everything here degrades gracefully when public/orig/ is absent.

export interface OrigManifest {
  version: number;
  videos: string[];
  music: string[];
  counts: Record<string, number>;
  bytes: Record<string, number>;
}

type AudioIndex = Record<string, Record<string, string>>;

const BASE = `${import.meta.env.BASE_URL}orig/`;

let manifest: OrigManifest | null = null;
let audio: AudioIndex = {};
let castOrder: Record<string, string[]> = {};
let lowerIndex: Record<string, Record<string, string>> = {};
let loading: Promise<boolean> | null = null;

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(BASE + path, { cache: 'no-cache' });
    if (!r.ok) return null;
    const ct = r.headers.get('content-type') ?? '';
    if (ct.includes('text/html')) return null; // SPA fallback page, not our JSON
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

/** Loads manifest + audio index. Resolves false if originals are not installed. Never throws. */
export function loadOriginalAssets(): Promise<boolean> {
  if (loading) return loading;
  loading = (async () => {
    const [m, idx] = await Promise.all([
      fetchJson<OrigManifest>('manifest.json'),
      fetchJson<AudioIndex & { _castOrder?: Record<string, string[]> }>('audio/index.json'),
    ]);
    if (!m || !idx) return false;
    manifest = m;
    castOrder = (idx._castOrder as unknown as Record<string, string[]>) ?? {};
    delete (idx as Record<string, unknown>)._castOrder;
    audio = idx;
    lowerIndex = {};
    for (const [cast, members] of Object.entries(audio)) {
      const l: Record<string, string> = {};
      for (const [name, url] of Object.entries(members)) l[name.toLowerCase()] = url;
      lowerIndex[cast] = l;
    }
    return true;
  })();
  return loading;
}

export function hasOriginals(): boolean {
  return manifest !== null;
}

export function getManifest(): OrigManifest | null {
  return manifest;
}

export function videoUrl(name: string): string | null {
  if (!manifest || !manifest.videos.includes(name)) return null;
  return `${BASE}video/${encodeURIComponent(name)}.mp4`;
}

export function musicUrl(name: string): string | null {
  if (!manifest || !manifest.music.includes(name)) return null;
  return `${BASE}music/${encodeURIComponent(name)}.mp3`;
}

/** Cast search order for a movie key like 'Adventure_AS004-02' (the movie's own casts first). */
export function castSearchOrder(movie: string): string[] {
  return castOrder[movie] ?? [movie, 'Shared_Audio-1', 'Shared_Audio-2', 'Shared_Audio-3', 'Shared_Interface', 'Shared_Inventar'];
}

/**
 * Resolve a sound member like Director's member("name"): search the movie's castLibs in order
 * (names are case-insensitive in Lingo). `memberName` may also be "cast/name" to force a cast.
 */
export function soundUrl(movie: string, memberName: string): string | null {
  const k = soundKey(movie, memberName);
  return k ? BASE + k.url : null;
}

/**
 * Like soundUrl, but also returns the resolved cast and the member's real name
 * (`key` = "<cast>/<Name>", the key format of audio/transcripts.json).
 */
export function soundKey(movie: string, memberName: string): { cast: string; name: string; key: string; url: string } | null {
  if (!manifest) return null;
  const find = (cast: string, lname: string) => {
    const u = lowerIndex[cast]?.[lname];
    if (!u) return null;
    const name = Object.keys(audio[cast]).find((n) => n.toLowerCase() === lname) ?? lname;
    return { cast, name, key: `${cast}/${name}`, url: u };
  };
  const slash = memberName.indexOf('/');
  if (slash > 0 && lowerIndex[memberName.slice(0, slash)]) return find(memberName.slice(0, slash), memberName.slice(slash + 1).toLowerCase());
  const key = memberName.toLowerCase();
  for (const cast of castSearchOrder(movie)) {
    const r = find(cast, key);
    if (r) return r;
  }
  return null;
}

/** audio/transcripts.json URL (optional machine transcription, "<cast>/<Name>" -> text) */
export function transcriptsUrl(): string {
  return BASE + 'audio/transcripts.json';
}
