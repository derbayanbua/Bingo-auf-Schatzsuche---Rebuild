"""Decode Director 7 bitmap cast members from ProjectorRays chunk dumps to PNG.

usage: python -I extract_bitmaps.py <chunkdir> <outdir>   (chunkdir = analysis/chunks/<Dir>_<Name>)
       python -I extract_bitmaps.py --all <chunksroot> <imgroot>
"""
import sys, os, re, json, struct, glob, site
try:
    from PIL import Image
except ImportError:  # running with -I: user site-packages not on path
    sys.path.append(site.getusersitepackages())
    from PIL import Image


def load_json(p):
    s = open(p, encoding='utf-8', errors='replace').read()
    s = re.sub(r'\\(?!["\\/bfnrtu])', r'\\\\', s)
    return json.loads(s, strict=False)


def win_system_palette():
    # Director "System - Win" palette (index 0 white ... 255 black), built like Director's:
    # 6x6x6 cube (descending), plus gray/red/green/blue ramps, plus Windows static colors.
    # Director's actual Windows palette == Mac system palette layout with the 20 Windows static
    # colours placed at 0..9 and 246..255. We approximate with the Mac layout + static colours.
    pal = mac_system_palette()
    static_lo = [(255,255,255),(0,255,255),(255,0,255),(0,0,255),(255,255,0),(0,255,0),(255,0,0),(128,128,128),(160,160,164),(255,251,240)]
    static_hi = [(192,220,192),(166,202,240),(192,192,192),(128,128,0),(128,0,128),(0,0,128),(0,128,128),(0,128,0),(128,0,0),(0,0,0)]
    for i, c in enumerate(static_lo):
        pal[i] = c
    for i, c in enumerate(static_hi):
        pal[246 + i] = c
    return pal


def mac_system_palette():
    pal = []
    steps = [255, 204, 153, 102, 51, 0]
    for r in steps:
        for g in steps:
            for b in steps:
                pal.append((r, g, b))
    pal = pal[:215]  # drop black, it is last
    ramp = [238, 221, 187, 170, 136, 119, 85, 68, 34, 17]
    for v in ramp: pal.append((v, 0, 0))
    for v in ramp: pal.append((0, v, 0))
    for v in ramp: pal.append((0, 0, v))
    for v in ramp: pal.append((v, v, v))
    pal.append((0, 0, 0))
    return pal


def grayscale_palette():
    return [(255 - i, 255 - i, 255 - i) for i in range(256)]


def read_clut(path):
    d = open(path, 'rb').read()
    pal = []
    for i in range(0, len(d) - 5, 6):
        pal.append((d[i], d[i + 2], d[i + 4]))
    while len(pal) < 256:
        pal.append((0, 0, 0))
    return pal


def unrle(data, expected):
    out = bytearray()
    i, n = 0, len(data)
    while i < n and len(out) < expected:
        c = data[i]; i += 1
        if c >= 0x80:
            if i >= n: break
            out += bytes([data[i]]) * (257 - c); i += 1
        else:
            out += data[i:i + c + 1]; i += c + 1
    if len(out) < expected:
        out += b'\0' * (expected - len(out))
    return bytes(out[:expected])


class ChunkDir:
    def __init__(self, root):
        self.root = root
        cands = glob.glob(os.path.join(root, '*', 'chunks'))
        self.cdir = cands[0] if cands else root
        self.casts = {}  # sectionID -> (json, bin)
        for p in glob.glob(os.path.join(self.cdir, 'CASt-*.json')):
            sid = int(re.search(r'CASt-(\d+)', p).group(1))
            self.casts[sid] = p
        self.children = {}
        for p in glob.glob(os.path.join(self.cdir, 'KEY_-*.json')):
            for e in load_json(p).get('entries', []):
                self.children.setdefault(e['castID'], {})[e['fourCC']] = e['sectionID']
        # member numbers: CAS_ list (first one = internal cast for movies)
        self.member_of = {}
        self.section_of_member = {}
        for p in sorted(glob.glob(os.path.join(self.cdir, 'CAS_-*.json')),
                        key=lambda x: int(re.search(r'CAS_-(\d+)', x).group(1))):
            ids = load_json(p).get('memberIDs', [])
            for i, sid in enumerate(ids):
                if sid and sid not in self.member_of:
                    self.member_of[sid] = i + 1
            break  # only first cast lib
        for sid, m in self.member_of.items():
            self.section_of_member[m] = sid

    def chunk(self, fourcc, sid):
        p = os.path.join(self.cdir, '%s-%d.bin' % (fourcc, sid))
        return open(p, 'rb').read() if os.path.exists(p) else None


# global CLUT registry: name -> palette, per dir: member -> palette
def palettes_of(cd):
    res = {}
    for sid, p in cd.casts.items():
        j = load_json(p)
        if j.get('type') == 4:
            c = cd.children.get(sid, {}).get('CLUT')
            if c is not None and cd.chunk('CLUT', c):
                res[sid] = (j['info'].get('name', ''), read_clut(os.path.join(cd.cdir, 'CLUT-%d.bin' % c)))
    return res


SHARED_PALS = None


def shared_palettes(chunks_root):
    global SHARED_PALS
    if SHARED_PALS is None:
        SHARED_PALS = []
        for d in sorted(glob.glob(os.path.join(chunks_root, '*'))):
            if os.path.isdir(d):
                for sid, (n, pal) in palettes_of(ChunkDir(d)).items():
                    SHARED_PALS.append((os.path.basename(d), sid, n, pal))
    return SHARED_PALS


def builtin(pid):
    # stored id: -1 mac(sys), -2 rainbow, -3 gray, ..., -101/-102 windows
    if pid in (-101, -102):
        return win_system_palette(), 'systemWin'
    if pid == -3:
        return grayscale_palette(), 'grayscale'
    return mac_system_palette(), 'systemMac(%d)' % pid


def decode(cd, sid, j, raw, chunks_root, stats):
    off = 12 + j['infoLen']
    sd = raw[off:off + j['specificDataLen']]
    if len(sd) < 22:
        return None
    pitch = struct.unpack('>H', sd[0:2])[0] & 0x7fff
    t, l, b, r = struct.unpack('>hhhh', sd[2:10])
    regY, regX = struct.unpack('>hh', sd[18:22])
    bpp = sd[23] if len(sd) > 23 else 1
    if not (struct.unpack('>H', sd[0:2])[0] & 0x8000):
        bpp = 1
    clutLib, clutId = (struct.unpack('>hh', sd[24:28]) if len(sd) >= 28 else (-1, -1))
    w, h = r - l, b - t
    bsid = cd.children.get(sid, {}).get('BITD')
    data = cd.chunk('BITD', bsid) if bsid is not None else None
    info = dict(castSection=sid, member=cd.member_of.get(sid), name=j['info'].get('name', ''),
                w=w, h=h, regX=regX - l, regY=regY - t, bpp=bpp, pitch=pitch,
                clutLib=clutLib, clutId=clutId)
    if data is None or w <= 0 or h <= 0:
        info['error'] = 'no data'
        return info, None
    if bpp == 32:
        exp = w * 4 * h
        buf = data if len(data) == exp else unrle(data, exp)
        img = Image.new('RGBA', (w, h))
        px = []
        if len(data) == exp and pitch == w * 4 and False:
            pass
        for y in range(h):
            row = buf[y * w * 4:(y + 1) * w * 4]
            a, rr, g, bb = row[0:w], row[w:2 * w], row[2 * w:3 * w], row[3 * w:4 * w]
            px.extend(zip(rr, g, bb, a))
        img.putdata(px)
        # if alpha is entirely 0 the alpha channel is unused
        if img.getextrema()[3][1] == 0:
            img.putalpha(255)
        return info, img
    if bpp == 16:
        # rows: pitch bytes, stored planar per row (hi bytes, then lo bytes) when RLE
        exp = pitch * h
        buf = data if len(data) == exp else unrle(data, exp)
        img = Image.new('RGB', (w, h))
        px = []
        for y in range(h):
            row = buf[y * pitch:(y + 1) * pitch]
            if len(data) == exp:
                vals = [(row[2 * x] << 8) | row[2 * x + 1] for x in range(w)]
            else:
                half = pitch // 2
                vals = [(row[x] << 8) | row[half + x] for x in range(w)]
            px.extend((((v >> 10) & 31) * 255 // 31, ((v >> 5) & 31) * 255 // 31, (v & 31) * 255 // 31) for v in vals)
        img.putdata(px)
        return info, img
    exp = pitch * h
    buf = data if len(data) == exp else unrle(data, exp)
    if bpp == 1:
        img = Image.frombytes('1', (w, h), buf, 'raw', '1;I', pitch)
        return info, img.convert('L')
    if bpp in (2, 4):
        mode = {2: 'P;2', 4: 'P;4'}[bpp]
    else:
        mode = 'P'
    img = Image.frombytes('P', (w, h), buf, 'raw', mode, pitch)
    # palette
    pal, pname = None, None
    if clutId > 0 or (clutId == 0):
        m = clutId if clutId > 0 else 0
        psid = cd.section_of_member.get(m)
        mypals = palettes_of(cd)
        if psid in mypals and clutLib in (-1, 0, 1):
            pname, pal = mypals[psid][0], mypals[psid][1]
        else:
            # palette from another cast lib: try shared palettes, prefer one with same member index
            for dn, psid2, n, p in shared_palettes(chunks_root):
                if ChunkDir(os.path.join(chunks_root, dn)).member_of.get(psid2) == m:
                    pal, pname = p, '%s:%s' % (dn, n)
                    break
    if pal is None:
        pal, pname = builtin(clutId if clutId < 0 else -1)
    info['palette'] = pname
    stats[pname] = stats.get(pname, 0) + 1
    flat = []
    for c in pal[:256]:
        flat += c
    img.putpalette(flat)
    return info, img.convert('RGB')


def safe(n):
    return re.sub(r'[^A-Za-z0-9_.\-]+', '_', n)[:60]


def run(chunkdir, outdir, chunks_root):
    cd = ChunkDir(chunkdir)
    os.makedirs(outdir, exist_ok=True)
    index, stats = [], {}
    for sid in sorted(cd.casts):
        j = load_json(cd.casts[sid])
        if j.get('type') != 1:
            continue
        raw = open(cd.casts[sid][:-5] + '.bin', 'rb').read()
        try:
            res = decode(cd, sid, j, raw, chunks_root, stats)
        except Exception as e:
            index.append(dict(castSection=sid, name=j['info'].get('name', ''), error=repr(e)))
            continue
        if res is None:
            continue
        info, img = res
        info['castID'] = sid
        if img is not None:
            fn = '%d_%s.png' % (sid, safe(info['name']))
            img.save(os.path.join(outdir, fn))
            info['file'] = fn
        index.append(info)
    json.dump(index, open(os.path.join(outdir, 'index.json'), 'w'), indent=1)
    print(os.path.basename(chunkdir), len(index), 'bitmaps', stats)


if __name__ == '__main__':
    if sys.argv[1] == '--all':
        root, out = sys.argv[2], sys.argv[3]
        for d in sorted(glob.glob(os.path.join(root, '*'))):
            if os.path.isdir(d):
                run(d, os.path.join(out, os.path.basename(d)), root)
    else:
        cd = sys.argv[1]
        run(cd, sys.argv[2], os.path.dirname(os.path.abspath(cd)))
