"""Export original bitmaps + compact runtime scores for the web remake (private use only).

    python -P export_graphics.py --work <WORK> --out <orig> [--force] [DirFilter ...]

Input : WORK/img/<Dir>_<Movie>/*.png + index.json   (extract_bitmaps.py)
        WORK/score/<Dir>_<Movie>.json               (parse_score.py)
Output: <orig>/gfx/<Dir>_<Movie>/<member>.webp
        <orig>/gfx/index.json       { dir: { member: [w,h,regX,regY,name] } }
        <orig>/gfx/score/<Dir>_<Movie>.json

Files are keyed by the Director *member number* inside their cast library (what the scores and
Lingo `member n of castLib m` use), not by the CASt section id.

Transparency: 32-bit members keep their alpha. 16-bit members get alpha baked from the ink the
scores draw them with: matte -> white flood-filled from the edges, backgroundTransparent /
transparent -> every pure white pixel. The ink of animation frames that never appear in a score
(pFirstMember..pLastMember ranges, siblings named Base-N) is inherited.
"""
import collections
import json
import os
import re
import sys
from concurrent.futures import ProcessPoolExecutor

from PIL import Image, ImageDraw

IMG = SCORE = OUT = None  # set in main() (--work <WORK> --out <orig>): WORK/img, WORK/score, <orig>/gfx
DIR_RE = re.compile(r'^(Adventure|Game|Landscape|Interface|Exchange|Chapter|Intro)_')
SHARED = {'Shared_Graphic-1', 'Shared_Graphic-2', 'Shared_Interface', 'Shared_Inventar'}
QUALITY = 88


# ----------------------------------------------------------------- Lingo property lists

TOK = re.compile(r'\s*(?:(\(member\s+(\d+)\s+of\s+castLib\s+(\d+)\))|(\(member\s+(\d+)\))|("(?:[^"]*)")|(#\w+)|'
                 r'(-?\d+\.\d+|-?\d+)|([\[\]:,])|(\w+))')


def parse_props(s):
    """'[#pA: 1, #pB: (member 4 of castLib 1), #pC: "x", #pD: #sym]' -> python object."""
    if not s:
        return {}
    toks = []
    pos = 0
    while pos < len(s):
        m = TOK.match(s, pos)
        if not m or m.end() == pos:
            break
        pos = m.end()
        if m.group(1):
            toks.append(('v', {'member': int(m.group(2)), 'castLib': int(m.group(3))}))
        elif m.group(4):
            toks.append(('v', {'member': int(m.group(5)), 'castLib': 0}))
        elif m.group(6):
            toks.append(('v', m.group(6)[1:-1]))
        elif m.group(7):
            toks.append(('sym', m.group(7)))
        elif m.group(8):
            t = m.group(8)
            toks.append(('v', float(t) if '.' in t else int(t)))
        elif m.group(9):
            toks.append(('p', m.group(9)))
        else:
            w = m.group(10)
            toks.append(('v', None if w in ('VOID', 'void') else w))
    i = 0

    def value():
        nonlocal i
        k, v = toks[i]
        if k == 'p' and v == '[':
            return lst()
        i += 1
        return v

    def lst():
        nonlocal i
        i += 1  # [
        if i < len(toks) and toks[i] == ('p', ':'):
            i += 2  # [:]
            return {}
        out_l, out_d = [], {}
        while i < len(toks) and toks[i] != ('p', ']'):
            if i + 1 < len(toks) and toks[i + 1] == ('p', ':'):
                key = toks[i][1]
                key = key[1:] if isinstance(key, str) and key.startswith('#') else key
                i += 2
                out_d[str(key)] = value()
            else:
                out_l.append(value())
            if i < len(toks) and toks[i] == ('p', ','):
                i += 1
        i += 1
        return out_d if out_d else out_l

    try:
        if toks and toks[0] == ('p', '['):
            return lst()
        return value() if toks else {}
    except Exception:
        return {'_raw': s}


# ----------------------------------------------------------------- inputs

def load_index(d):
    p = os.path.join(IMG, d, 'index.json')
    if not os.path.exists(p):
        return {}
    return {e['member']: e for e in json.load(open(p, encoding='utf-8')) if 'file' in e and e.get('member')}


def lib_dirs(o):
    """castLib number (1-based) -> dump dir (local casts -> the movie's own dir)."""
    out = []
    for c in o['castLibs']:
        out.append(c.get('dump') or (o['movie'] if not c.get('file') else None))
    return out


def scores():
    for f in sorted(os.listdir(SCORE)):
        if f.endswith('.json') and DIR_RE.match(f):
            yield f[:-5], json.load(open(os.path.join(SCORE, f), encoding='utf-8'))


def collect_inks(all_scores, indexes):
    use = collections.defaultdict(collections.Counter)  # (dir, member) -> ink counter
    for name, o in all_scores:
        libs = lib_dirs(o)
        for fr in o['frames']:
            for s in fr['sprites']:
                cl = s['castLib']
                if not (1 <= cl <= len(libs)) or not libs[cl - 1]:
                    continue
                d = libs[cl - 1]
                use[(d, s['member'])][s['ink']] += 1
                # animation ranges inherit the sprite ink
                for b in s.get('behaviors', []):
                    p = parse_props(b.get('params', ''))
                    if isinstance(p, dict) and isinstance(p.get('pFirstMember'), dict) and isinstance(p.get('pLastMember'), dict):
                        a, z = p['pFirstMember'], p['pLastMember']
                        lib = a['castLib'] or cl
                        if lib == (z['castLib'] or cl) and 1 <= lib <= len(libs) and libs[lib - 1]:
                            for m in range(min(a['member'], z['member']), max(a['member'], z['member']) + 1):
                                use[(libs[lib - 1], m)][s['ink']] += 1
    inks = {}
    for k, c in use.items():
        keyed = c['matte'] + c['backgroundTransparent'] + c['transparent']
        if keyed and keyed >= c['copy']:
            inks[k] = 'matte' if c['matte'] >= c['backgroundTransparent'] + c['transparent'] else 'backgroundTransparent'
    # siblings Base-N inherit
    for d, idx in indexes.items():
        base = collections.defaultdict(list)
        for m, e in idx.items():
            base[re.sub(r'-\d+$', '', e['name'] or '')].append(m)
        for ms in base.values():
            got = [inks[(d, m)] for m in ms if (d, m) in inks]
            if got:
                for m in ms:
                    inks.setdefault((d, m), got[0])
    return inks


# ----------------------------------------------------------------- conversion

def convert(job):
    src, dst, bpp, ink, force = job
    if not force and os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
        return dst, os.path.getsize(dst)
    im = Image.open(src)
    if bpp == 32 and im.mode == 'RGBA':
        pass
    else:
        im = im.convert('RGB')
        if ink in ('matte', 'backgroundTransparent'):
            rgb = im
            w, h = rgb.size
            # pure white where all three channels are 255
            r, g, b = rgb.split()
            white = Image.eval(r, lambda v: 255 if v == 255 else 0)
            for ch in (g, b):
                white = Image.composite(white, Image.new('L', (w, h), 0), Image.eval(ch, lambda v: 255 if v == 255 else 0))
            if ink == 'matte':
                pad = Image.new('L', (w + 2, h + 2), 255)
                pad.paste(white, (1, 1))
                ImageDraw.floodfill(pad, (0, 0), 128, thresh=0)
                mask = pad.crop((1, 1, w + 1, h + 1)).point(lambda v: 0 if v == 128 else 255)
            else:
                mask = white.point(lambda v: 0 if v == 255 else 255)
            im = rgb.convert('RGBA')
            im.putalpha(mask)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    big = im.size[0] * im.size[1] > 20000
    if big:
        im.save(dst, 'WEBP', quality=QUALITY, method=4)
    else:
        im.save(dst, 'WEBP', lossless=True, quality=80, method=4)
    return dst, os.path.getsize(dst)


def runtime_score(o, gfx_index):
    libs = lib_dirs(o)
    frames = []
    for fr in o['frames']:
        sp = []
        for s in fr['sprites']:
            bh = [{'name': b.get('name'), 'params': parse_props(b.get('params', ''))} for b in s.get('behaviors', [])]
            row = [s['ch'], s['castLib'], s['member'], s['left'], s['top'], s['width'], s['height'], s['ink'], s['blend'],
                   bh, s.get('name') or '']
            sp.append(row)
        f = {'frames': fr['frames'], 'sprites': sp}
        if fr.get('script'):
            f['script'] = fr['script'].get('name')
        if fr.get('tempo'):
            f['tempo'] = fr['tempo']
        frames.append(f)
    return {'movie': o['movie'], 'frameCount': o['frameCount'], 'libs': libs,
            'libNames': [c['name'] for c in o['castLibs']], 'labels': o['labels'], 'frames': frames}


def main():
    global IMG, SCORE, OUT
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--work', required=True, help='work dir containing img/ and score/')
    ap.add_argument('--out', required=True, help='target orig/ dir (gfx/ is created inside)')
    ap.add_argument('--force', action='store_true')
    ap.add_argument('filter', nargs='*')
    a = ap.parse_args()
    IMG, SCORE = os.path.join(a.work, 'img'), os.path.join(a.work, 'score')
    OUT = os.path.join(a.out, 'gfx')
    force, filt = a.force, a.filter
    dirs = sorted(d for d in os.listdir(IMG) if (DIR_RE.match(d) or d in SHARED) and (not filt or any(x in d for x in filt)))
    indexes = {d: load_index(d) for d in dirs}
    all_scores = list(scores())
    inks = collect_inks(all_scores, indexes)
    jobs, gfx_index = [], {}
    for d in dirs:
        ent = {}
        for m, e in sorted(indexes[d].items()):
            ent[str(m)] = [e['w'], e['h'], e['regX'], e['regY'], e['name'] or '']
            jobs.append((os.path.join(IMG, d, e['file']), os.path.join(OUT, d, '%d.webp' % m), e['bpp'], inks.get((d, m), 'copy'), force))
        gfx_index[d] = ent
    total = 0
    with ProcessPoolExecutor() as ex:
        for i, (_, size) in enumerate(ex.map(convert, jobs, chunksize=16)):
            total += size
            if i % 500 == 0:
                print(i, '/', len(jobs), flush=True)
    os.makedirs(os.path.join(OUT, 'score'), exist_ok=True)
    if filt:  # merge into an existing index
        p = os.path.join(OUT, 'index.json')
        if os.path.exists(p):
            old = json.load(open(p, encoding='utf-8'))
            old.update(gfx_index)
            gfx_index = old
    json.dump(gfx_index, open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    ssize = 0
    for name, o in all_scores:
        if filt and not any(x in name for x in filt):
            continue
        p = os.path.join(OUT, 'score', name + '.json')
        json.dump(runtime_score(o, gfx_index), open(p, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        ssize += os.path.getsize(p)
    print('images: %d, %.1f MB; scores %.1f MB; keyed members: %d' % (len(jobs), total / 1e6, ssize / 1e6,
                                                                     sum(1 for (d, _m) in inks if d in indexes)))


if __name__ == '__main__':
    main()
