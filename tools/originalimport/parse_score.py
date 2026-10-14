"""Parse Director 7 score (VWSC) + labels (VWLB) from ProjectorRays chunk dumps into JSON.

Usage: python -I parse_score.py --work <WORK> [movieDir ...]   (default: all movie dirs in WORK/chunks)
Input : WORK/chunks/<Dir>_<Movie>/... (ProjectorRays dumps), WORK/img/... (extract_bitmaps.py)
Output: WORK/score/<Dir>_<Movie>.json

VWSC (D7) layout:
  header: totalLen u32, ver i32 (-3), listStart u32
  @listStart: entryCount u32, offsetCount u32 (=entryCount+1), dataLen u32, then offsetCount u32 offsets
  entry 0: frame data   (u32 len, u32 hdrLen(20), u32 numFrames, u16 ver, u16 recSize(48), u16 numChannels, u16 ?)
           frames: u16 frameLen, then (u16 size, u16 offset, bytes) deltas into a numChannels*48 buffer
           channel 0..5 = script, tempo, transition, sound2, sound1, palette; sprite N at channel N+5
  entry 1: list of interval (primary) entry indices
  entry k  (primary, 44 bytes): startFrame u32, endFrame u32, ?, ?, channel u32, ...
  entry k+1 (behaviors): n * (castLib u16, member u16, initializerEntry u32)
  initializerEntry: C-string property list
  Sprite records carry spriteListIdx (offset 8) = k of their interval.
"""
import json, re, os, sys, struct, glob

CH = IMG = OUT = None


def set_work(work):
    global CH, IMG, OUT
    CH = os.path.join(work, 'chunks')
    IMG = os.path.join(work, 'img')
    OUT = os.path.join(work, 'score')

INKS = {0: 'copy', 1: 'transparent', 2: 'reverse', 3: 'ghost', 4: 'notCopy', 5: 'notTransparent',
        6: 'notReverse', 7: 'notGhost', 8: 'matte', 9: 'mask', 32: 'blend', 33: 'addPin', 34: 'add',
        35: 'subPin', 36: 'backgroundTransparent', 37: 'lightest', 38: 'subtract', 39: 'darkest',
        40: 'lighten', 41: 'darken'}
CTYPES = {1: 'bitmap', 2: 'filmLoop', 3: 'text', 4: 'palette', 5: 'picture', 6: 'sound', 7: 'button',
          8: 'shape', 9: 'movie', 10: 'digitalVideo', 11: 'script', 12: 'rtfText', 13: 'ole', 14: 'transition',
          15: 'xtra'}


def loadj(p):
    s = open(p, encoding='utf-8', errors='replace').read()
    s = re.sub(r'\\(.?)', lambda m: m.group(0) if m.group(1) and m.group(1) in '"\\/bfnrtu' else '\\\\' + m.group(1), s, flags=re.S)
    return json.loads(s, strict=False)


def chunkdir(d):
    g = glob.glob(os.path.join(d, '*', 'chunks'))
    return g[0] if g else None


def find(cd, fourcc):
    g = sorted(glob.glob(os.path.join(cd, fourcc + '-*.bin')), key=lambda x: int(re.findall(r'-(\d+)\.bin$', x)[0]))
    return g


_castcache = {}


def load_castlib(cd, castID, imgdir):
    """Return {memberNum: {name,type,img?,regX,regY,w,h}} for the CAS* belonging to castID (None = only one)."""
    key = (cd, castID)
    if key in _castcache:
        return _castcache[key]
    keyf = find(cd, 'KEY_')
    sec = None
    if keyf:
        kj = loadj(keyf[0].replace('.bin', '.json'))
        cas = [e for e in kj['entries'] if e['fourCC'] == 'CAS*']
        for e in cas:
            if castID is None or e['castID'] == castID:
                sec = e['sectionID']
                break
    res = {}
    if sec is not None and os.path.exists(os.path.join(cd, 'CAS_-%d.json' % sec)):
        ids = loadj(os.path.join(cd, 'CAS_-%d.json' % sec))['memberIDs']
        imgidx = {}
        ip = os.path.join(IMG, imgdir, 'index.json')
        if os.path.exists(ip):
            for e in loadj(ip):
                imgidx[e.get('castID', e.get('castSection'))] = e
        for i, s in enumerate(ids):
            if not s:
                continue
            p = os.path.join(cd, 'CASt-%d.json' % s)
            if not os.path.exists(p):
                continue
            cj = loadj(p)
            m = {'name': cj.get('info', {}).get('name', ''), 'type': CTYPES.get(cj['type'], cj['type'])}
            if s in imgidx and 'file' in imgidx[s]:
                e = imgidx[s]
                m.update(img=os.path.join(imgdir, e['file']), w=e['w'], h=e['h'], regX=e['regX'], regY=e['regY'])
            res[i + 1] = m
    _castcache[key] = res
    return res


def resolve_casts(cd, movieKey):
    mj = loadj(find(cd, 'MCsL')[0].replace('.bin', '.json'))
    libs = []
    for n, e in enumerate(mj['entries'], 1):
        fp = e['filePath']
        info = {'castLib': n, 'name': e['name'], 'file': fp}
        if fp:
            parts = fp.replace('\\', '/').split('/')
            base = os.path.splitext(parts[-1])[0]
            folder = parts[-2] if len(parts) > 1 else 'Shared'
            dname = ('Shared_' if folder.lower() == 'shared' else folder + '_') + base
            ecd = chunkdir(os.path.join(CH, dname))
            info['dump'] = dname
            members = load_castlib(ecd, None, dname) if ecd else {}
        else:
            members = load_castlib(cd, e['id'], movieKey)
        libs.append((info, members))
    return libs


def parse_labels(cd):
    f = find(cd, 'VWLB')
    if not f:
        return []
    b = open(f[0], 'rb').read()
    count = struct.unpack('>H', b[:2])[0]
    base = 2 + (count + 1) * 4
    ent = [struct.unpack('>HH', b[2 + i * 4:6 + i * 4]) for i in range(count + 1)]
    out = []
    for i in range(count):
        fr, sp = ent[i]
        ep = ent[i + 1][1]
        out.append({'frame': fr, 'name': b[base + sp:base + ep].decode('mac_roman').rstrip('\x00')})
    return out


def parse_vwsc(path):
    b = open(path, 'rb').read()
    tot, ver, ls = struct.unpack('>iiI', b[:12])
    n, n1, dl = struct.unpack('>III', b[ls:ls + 12])
    idx = ls + 12
    offs = struct.unpack('>%dI' % n1, b[idx:idx + 4 * n1])
    base = idx + 4 * n1
    ents = [b[base + offs[i]:base + offs[i + 1]] for i in range(n1 - 1)]
    f = ents[0]
    flen, hlen, nframes, fver, rsz, nch, _ = struct.unpack('>IIIHHHH', f[:20])
    buf = bytearray(nch * rsz)
    frames = []
    pos = hlen
    for fi in range(nframes):
        fl = struct.unpack('>H', f[pos:pos + 2])[0]
        end = pos + fl
        p = pos + 2
        while p < end:
            sz, of = struct.unpack('>HH', f[p:p + 4])
            p += 4
            buf[of:of + sz] = f[p:p + sz]
            p += sz
        frames.append(bytes(buf))
        pos = end
    return ents, frames, rsz, nch


def cstr(e):
    return e.split(b'\x00')[0].decode('mac_roman')


def behaviors(ents, li, libs):
    if not li or li + 1 >= len(ents):
        return None
    e = ents[li + 1]
    out = []
    for i in range(0, len(e) - 7, 8):
        cl, mem, ini = struct.unpack('>HHI', e[i:i + 8])
        bh = {'castLib': cl, 'member': mem, 'name': memname(libs, cl, mem)}
        if ini and ini < len(ents):
            bh['params'] = cstr(ents[ini])
        out.append(bh)
    return out


def memname(libs, cl, mem):
    if 1 <= cl <= len(libs):
        m = libs[cl - 1][1].get(mem)
        if m:
            return m['name']
    return None


def member(libs, cl, mem):
    if 1 <= cl <= len(libs):
        return libs[cl - 1][1].get(mem)
    return None


def decode_frame(fr, rsz, nch, ents, libs):
    d = {}
    s = fr[0:48]
    acl, amem, sli = struct.unpack('>HHI', s[:8])
    if amem:
        d['script'] = {'castLib': acl, 'member': amem, 'name': memname(libs, acl, amem)}
    bh = behaviors(ents, sli, libs)
    if bh:
        d['scriptBehaviors'] = bh
    t = fr[48:96]
    if t[6]:
        d['tempo'] = t[6]
    tr = fr[96:144]
    tcl, tm = struct.unpack('>HH', tr[:4])
    if tm:
        d['transition'] = {'castLib': tcl, 'member': tm, 'name': memname(libs, tcl, tm)}
    for nm, o in (('sound2', 144), ('sound1', 192)):
        scl, sm = struct.unpack('>HH', fr[o:o + 4])
        if sm:
            d[nm] = {'castLib': scl, 'member': sm, 'name': memname(libs, scl, sm)}
    pcl, pm = struct.unpack('>hh', fr[240:244])
    if pm:
        d['palette'] = {'castLib': pcl, 'member': pm}
    sprites = []
    for ch in range(1, nch - 5):
        o = (ch + 5) * rsz
        r = fr[o:o + rsz]
        if not any(r):
            continue
        stype, ink, fg, bg, cl, mem, li, locV, locH, h, w, cc, blend, thick, flags = struct.unpack(
            '>BBBBhHIhhhhBBBB', r[:24])
        if mem == 0 and stype == 0 and not li:
            continue
        sp = {'ch': ch, 'castLib': cl, 'member': mem}
        m = member(libs, cl, mem)
        if m:
            sp['name'] = m['name']
            sp['mtype'] = m['type']
        if m and 'regX' in m and not (ink & 0x80):
            w, h = m['w'], m['h']  # unstretched sprites always render at member size
        sp.update(locH=locH, locV=locV, width=w, height=h)
        if m and 'regX' in m:
            sp['left'] = locH - m['regX']
            sp['top'] = locV - m['regY']
            # stretched sprites: scale reg point
            if m['w'] and m['h'] and (w, h) != (m['w'], m['h']) and w > 0 and h > 0:
                sp['left'] = locH - round(m['regX'] * w / m['w'])
                sp['top'] = locV - round(m['regY'] * h / m['h'])
        else:
            sp['left'], sp['top'] = locH, locV
        sp['right'] = sp['left'] + w
        sp['bottom'] = sp['top'] + h
        sp['ink'] = INKS.get(ink & 0x3f, ink & 0x3f)
        if ink & 0x40: sp['trails'] = 1
        if ink & 0x80: sp['stretch'] = 1
        sp['blend'] = round(100 - blend * 100 / 255)  # D7 stores inverted: raw 0 -> 100%, 255 -> 0%
        sp['spriteType'] = stype
        if fg or bg: sp['fore'], sp['back'] = fg, bg
        if cc & 0x40: sp['editable'] = 1
        if cc & 0x80: sp['moveable'] = 1
        if flags: sp['flags'] = flags
        rot = struct.unpack('>i', r[28:32])[0]
        if rot: sp['rotation'] = rot / 100
        bh = behaviors(ents, li, libs)
        if bh:
            sp['behaviors'] = bh
        sprites.append(sp)
    d['sprites'] = sprites
    return d


def ranges(lst):
    out = []
    for x in lst:
        if out and out[-1][1] == x - 1:
            out[-1][1] = x
        else:
            out.append([x, x])
    return [a if a == b else '%d-%d' % (a, b) for a, b in out]


def intervals(ents, libs):
    res = []
    if len(ents) < 2 or len(ents[1]) < 4:
        return res
    e1 = ents[1]
    cnt = struct.unpack('>I', e1[:4])[0]
    for i in range(cnt):
        k = struct.unpack('>I', e1[4 + i * 4:8 + i * 4])[0]
        if k >= len(ents) or len(ents[k]) < 20:
            continue
        st, en, _, _, chn = struct.unpack('>IIIII', ents[k][:20])
        res.append({'entry': k, 'start': st, 'end': en, 'rawChannel': chn,
                    'channel': ('script' if chn == 0 else chn - 5 if chn > 5 else 'main%d' % chn),
                    'behaviors': behaviors(ents, k, libs) or []})
    return res


def process(dirname):
    cd = chunkdir(os.path.join(CH, dirname))
    vw = find(cd, 'VWSC') if cd else []
    if not vw:
        return None
    libs = resolve_casts(cd, dirname)
    ents, frames, rsz, nch = parse_vwsc(vw[0])
    dec = [decode_frame(f, rsz, nch, ents, libs) for f in frames]
    groups = {}
    order = []
    for i, d in enumerate(dec, 1):
        k = json.dumps(d)
        if k not in groups:
            groups[k] = []
            order.append(k)
        groups[k].append(i)
    # ordering preserved by json.loads (dict insertion order)
    out = {'movie': dirname, 'frameCount': len(frames), 'channels': nch - 6,
           'castLibs': [dict(info, members=len(m)) for info, m in libs],
           'labels': parse_labels(cd),
           'intervals': intervals(ents, libs),
           'frames': [dict(frames=ranges(groups[k]), **json.loads(k)) for k in order]}
    return out


def dump(o):
    # compact: one sprite per line
    J = lambda x: json.dumps(x, ensure_ascii=False)
    L = ['{']
    for k in ('movie', 'frameCount', 'channels'):
        L.append(' %s: %s,' % (J(k), J(o[k])))
    for k in ('castLibs', 'labels', 'intervals'):
        L.append(' %s: [' % J(k))
        L.append(',\n'.join('  ' + J(x) for x in o[k]))
        L.append(' ],')
    L.append(' "frames": [')
    fr = []
    for f in o['frames']:
        parts = ['  {']
        items = [(k, v) for k, v in f.items() if k != 'sprites']
        parts.append(',\n'.join('   %s: %s' % (J(k), J(v)) for k, v in items) + ',')
        parts.append('   "sprites": [\n' + ',\n'.join('    ' + J(s) for s in f['sprites']) + '\n   ]')
        parts.append('  }')
        fr.append('\n'.join(parts))
    L.append(',\n'.join(fr))
    L.append(' ]')
    L.append('}')
    return '\n'.join(L)


def preview(name, frame=1):
    """Composite one frame onto an 800x600 canvas -> score/preview_<name>.png"""
    from PIL import Image, ImageDraw
    o = json.load(open(os.path.join(OUT, name + '.json'), encoding='utf-8'))
    cd = chunkdir(os.path.join(CH, name))
    libs = resolve_casts(cd, name)
    f = None
    for g in o['frames']:
        for r in g['frames']:
            a, _, b = str(r).partition('-')
            if int(a) <= frame <= int(b or a):
                f = g
    im = Image.new('RGBA', (800, 600), (40, 40, 40, 255))
    dr = ImageDraw.Draw(im)
    for s in f['sprites']:
        m = member(libs, s['castLib'], s['member'])
        box = (s['left'], s['top'], s['right'], s['bottom'])
        if m and 'img' in m and s['width'] > 0:
            src = Image.open(os.path.join(IMG, m['img'])).convert('RGBA')
            if src.size != (s['width'], s['height']):
                src = src.resize((s['width'], s['height']))
            if s['ink'] in ('copy',) and m['type'] == 'bitmap':
                pass
            elif s['ink'] in ('matte', 'backgroundTransparent', 'transparent'):
                px = src.load()  # knock out white
                for y in range(src.size[1]):
                    for x in range(src.size[0]):
                        if px[x, y][:3] == (255, 255, 255):
                            px[x, y] = (0, 0, 0, 0)
            if s['blend'] != 100:
                a = src.split()[3].point(lambda v: v * s['blend'] // 100)
                src.putalpha(a)
            layer = Image.new('RGBA', im.size, (0, 0, 0, 0))
            layer.paste(src, (box[0], box[1]))
            im.alpha_composite(layer)
        else:
            if box[2] > box[0] and box[3] > box[1]:
                dr.rectangle(box, outline=(255, 0, 0, 255))
        dr.text((box[0] + 2, box[1] + 2), str(s['ch']), fill=(255, 255, 0, 255))
    p = os.path.join(OUT, 'preview_%s.png' % name)
    im.save(p)
    print('wrote', p)


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--work', required=True)
    ap.add_argument('--preview', nargs='+')
    ap.add_argument('names', nargs='*')
    a = ap.parse_args()
    set_work(a.work)
    os.makedirs(OUT, exist_ok=True)
    if a.preview:
        preview(a.preview[0], int(a.preview[1]) if len(a.preview) > 1 else 1)
        return
    fails = 0
    names = a.names or [d for d in sorted(os.listdir(CH)) if re.match(
        r'(Adventure|Game|Landscape|Interface|Exchange|Chapter|Intro)_', d)]
    for n in names:
        try:
            o = process(n)
        except Exception as ex:
            print('FAIL', n, repr(ex))
            fails += 1
            continue
        if o is None:
            print('skip', n)
            continue
        open(os.path.join(OUT, n + '.json'), 'w', encoding='utf-8').write(dump(o))
        print(n, o['frameCount'], 'frames', len(o['frames']), 'distinct', len(o['labels']), 'labels')
    print('scores done, failures:', fails)


if __name__ == '__main__':
    main()
