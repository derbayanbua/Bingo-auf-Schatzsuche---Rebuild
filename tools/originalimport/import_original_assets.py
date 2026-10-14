"""Import original media (videos, music, sound cast members) into <orig>.

Private use only (the user's own copy). Idempotent: existing outputs are skipped unless --force.
Run:  python -P import_original_assets.py --game <dir with Soundtrack/ + Software/> --video <dir with *.smk>
          --work <WORK> --out <orig> --ffmpeg <ffmpeg.exe>
"""
import argparse, glob, json, os, re, struct, subprocess, sys, tempfile, time
from concurrent.futures import ThreadPoolExecutor

FFMPEG = 'ffmpeg'


def load_json(path):
    s = open(path, encoding='utf-8', errors='replace').read()
    try:
        return json.loads(s, strict=False)
    except ValueError:
        pass
    s = re.sub(r'\\(?!["\\/bfnrtu])', r'\\\\', s)
    return json.loads(s, strict=False)


def ff(args):
    r = subprocess.run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-y'] + args,
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if r.returncode:
        raise RuntimeError(r.stderr.decode(errors='replace')[-800:])


def safe(name):
    s = re.sub(r'[^A-Za-z0-9._()\-]+', '_', name).strip('_.')
    return s or 'unnamed'


def need(out, force):
    return force or not os.path.exists(out) or os.path.getsize(out) == 0


# ---------------------------------------------------------------- video / music
def do_videos(video_dir, out, force):
    res = []
    vids = sorted(glob.glob(os.path.join(video_dir, '*.smk')))
    def one(src):
        name = os.path.splitext(os.path.basename(src))[0]
        dst = os.path.join(out, 'video', name + '.mp4')
        if need(dst, force):
            tmp = dst + '.part.mp4'
            ff(['-i', src, '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p',
                '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', tmp])
            os.replace(tmp, dst)
        return name
    with ThreadPoolExecutor(3) as ex:
        res = list(ex.map(one, vids))
    return res


def do_music(installed, out, force):
    srcs = sorted(glob.glob(os.path.join(installed, 'Soundtrack', '*.wav')))
    o = os.path.join(installed, 'Software', 'Adventure', 'Outtake.wav')
    if os.path.exists(o):
        srcs.append(o)
    names = []
    for src in srcs:
        name = os.path.splitext(os.path.basename(src))[0]
        dst = os.path.join(out, 'music', name + '.mp3')
        if need(dst, force):
            ff(['-i', src, '-c:a', 'libmp3lame', '-b:a', '128k', dst])
        names.append(name)
    return names


# ---------------------------------------------------------------- sound cast members
def find_chunk_dir(movie_dir):
    for d, _, files in os.walk(movie_dir):
        if any(f.startswith('KEY_') for f in files):
            return d
    return None


def sound_members(cdir):
    """Yield (name, kind, data...) for each sound cast member in a chunk directory."""
    files = os.listdir(cdir)
    by_sec = {}
    for f in files:
        m = re.match(r'^(.{4})-(\d+)\.bin$', f)
        if m:
            by_sec[int(m.group(2))] = (m.group(1), os.path.join(cdir, f))
    key = [f for f in files if f.startswith('KEY_') and f.endswith('.json')]
    children = {}
    for k in key:
        for e in load_json(os.path.join(cdir, k)).get('entries', []):
            children.setdefault(e['castID'], {})[e['fourCC']] = e['sectionID']
    for f in files:
        m = re.match(r'^CASt-(\d+)\.json$', f)
        if not m:
            continue
        cid = int(m.group(1))
        try:
            c = load_json(os.path.join(cdir, f))
        except Exception:
            continue
        if c.get('type') != 6:
            continue
        name = (c.get('info') or {}).get('name') or f'member{cid}'
        ch = children.get(cid, {})
        yield cid, name, ch, by_sec


def decode_member(ch, by_sec, dst):
    """Returns (format string, sample rate) or None."""
    def path(fourcc):
        sec = ch.get(fourcc)
        if sec is None or sec not in by_sec:
            return None
        p = by_sec[sec][1]
        return p if os.path.getsize(p) > 0 else None
    h, s, e, snd = path('sndH'), path('sndS'), path('ediM'), path('snd ')
    if h and s:
        b = open(h, 'rb').read()
        rate, bits, chans = struct.unpack('>I', b[0x2C:0x30])[0], struct.unpack('>I', b[0x44:0x48])[0], struct.unpack('>I', b[0x4C:0x50])[0]
        fmt = {16: 's16be', 8: 'u8'}[bits]
        args = ['-f', fmt, '-ar', str(rate), '-ac', str(chans), '-i', s]
        desc = f'sndH/sndS pcm{bits}be {rate}Hz {chans}ch'
    elif e:
        head = open(e, 'rb').read(4)
        args = ['-i', e]
        desc = 'ediM ' + ('wav' if head == b'RIFF' else 'other')
        rate = None
    elif snd:
        args = ['-i', snd]  # classic snd resources not present in this game
        desc = 'snd'
        rate = None
    else:
        return None
    voice_like = True
    br = '96k' if voice_like else '128k'
    ff(args + ['-ac', '1', '-c:a', 'libmp3lame', '-b:a', br, dst])
    return desc


def do_audio(chunks, out, force):
    index, stats, problems = {}, {}, []
    jobs = []
    for md in sorted(os.listdir(chunks)):
        cdir = find_chunk_dir(os.path.join(chunks, md))
        if not cdir:
            continue
        used = set()
        for cid, name, ch, by_sec in sound_members(cdir):
            fn = safe(name)
            base = fn
            i = 2
            while fn.lower() in used:
                fn = f'{base}_{i}'; i += 1
            used.add(fn.lower())
            rel = f'audio/{md}/{fn}.mp3'
            jobs.append((md, name, ch, by_sec, rel))

    def one(j):
        md, name, ch, by_sec, rel = j
        dst = os.path.join(out, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if not need(dst, force):
            return j, 'cached'
        try:
            r = decode_member(ch, by_sec, dst)
            return j, r
        except Exception as ex:
            return j, 'ERR ' + str(ex)[:200]

    with ThreadPoolExecutor(os.cpu_count() or 4) as ex:
        for j, r in ex.map(one, jobs):
            md, name, _, _, rel = j
            if r is None or r.startswith('ERR'):
                problems.append(f'{md}/{name}: {r or "no media chunk"}')
                continue
            index.setdefault(md, {}).setdefault(name, rel)
            stats[r.split(' ')[0]] = stats.get(r.split(' ')[0], 0) + 1
    return index, stats, problems


def cast_order(score_dir, chunks):
    order = {}
    for f in sorted(glob.glob(os.path.join(score_dir, '*.json'))):
        md = os.path.splitext(os.path.basename(f))[0]
        try:
            libs = load_json(f).get('castLibs') or []
        except Exception:
            continue
        seq = []
        for lib in sorted(libs, key=lambda l: l.get('castLib', 0)):
            d = lib.get('dump')
            if not d and lib.get('file'):
                p = lib['file'].replace('\\', '/').split('/')
                d = f'{p[-2]}_{os.path.splitext(p[-1])[0]}'
            if not d:
                d = md  # internal cast
            if d not in seq:
                seq.append(d)
        order[md] = seq
    return order


def main():
    global FFMPEG
    ap = argparse.ArgumentParser()
    ap.add_argument('--game', required=True, help='CD or installation root (Soundtrack/, Software/Adventure/Outtake.wav)')
    ap.add_argument('--video', help='folder with the *.smk videos (default: <game>/Video)')
    ap.add_argument('--work', required=True, help='work dir containing chunks/ and score/')
    ap.add_argument('--out', required=True)
    ap.add_argument('--ffmpeg', required=True)
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--skip-video', action='store_true')
    a = ap.parse_args()
    FFMPEG = a.ffmpeg
    a.installed = a.game
    a.cd = a.video or os.path.join(a.game, 'Video')
    a.chunks = os.path.join(a.work, 'chunks')
    a.score = os.path.join(a.work, 'score')
    for d in ('video', 'music', 'audio'):
        os.makedirs(os.path.join(a.out, d), exist_ok=True)
    t = time.time()
    index, stats, problems = do_audio(a.chunks, a.out, a.force)
    index['_castOrder'] = cast_order(a.score, a.chunks)
    json.dump(index, open(os.path.join(a.out, 'audio', 'index.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('audio', stats, 'problems', len(problems), f'{time.time()-t:.0f}s')
    for p in problems[:20]:
        print('  ', p)
    music = do_music(a.installed, a.out, a.force)
    print('music', len(music))
    videos = [] if a.skip_video else do_videos(a.cd, a.out, a.force)
    if a.skip_video:
        videos = [os.path.splitext(f)[0] for f in os.listdir(os.path.join(a.out, 'video')) if f.endswith('.mp4')]
    print('video', len(videos), f'{time.time()-t:.0f}s')

    def size(sub):
        return sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(os.path.join(a.out, sub)) for f in fs)
    man = {
        'version': 1,
        'videos': sorted(videos), 'music': sorted(music),
        'counts': {'video': len(videos), 'music': len(music),
                   'audio': sum(len(v) for k, v in index.items() if k != '_castOrder')},
        'bytes': {s: size(s) for s in ('video', 'music', 'audio')},
    }
    man['bytes']['total'] = sum(man['bytes'].values())
    json.dump(man, open(os.path.join(a.out, 'manifest.json'), 'w', encoding='utf-8'), indent=1)
    print(json.dumps(man['counts']), json.dumps(man['bytes']))


if __name__ == '__main__':
    main()
