"""Transcribe voice-like clips of public/orig/audio with faster-whisper (German) -> audio/transcripts.json.
Incremental: already transcribed keys are kept.
python -P transcribe_voices.py --out <orig> --ffmpeg <ffmpeg.exe> [--model small]"""
import argparse, json, os, time
import subprocess

ap = argparse.ArgumentParser()
ap.add_argument('--out', required=True)
ap.add_argument('--ffmpeg', required=True)
ap.add_argument('--model', default='small')
ap.add_argument('--min', type=float, default=0.6)
ap.add_argument('--max', type=float, default=60.0)
a = ap.parse_args()

from faster_whisper import WhisperModel
import numpy as np
FF = a.ffmpeg
def decode_audio(f, sampling_rate=16000):
    r=subprocess.run([FF,'-v','error','-i',f,'-ac','1','-ar',str(sampling_rate),'-f','f32le','-'],stdout=subprocess.PIPE,check=True)
    return np.frombuffer(r.stdout,dtype=np.float32)

idx = json.load(open(os.path.join(a.out, 'audio', 'index.json'), encoding='utf-8'))
tp = os.path.join(a.out, 'audio', 'transcripts.json')
res = json.load(open(tp, encoding='utf-8')) if os.path.exists(tp) else {}
model = WhisperModel(a.model, device='cpu', compute_type='int8')
t0 = time.time(); n = 0
for cast, members in idx.items():
    if cast == '_castOrder':
        continue
    for name, rel in members.items():
        key = f'{cast}/{name}'
        if key in res:
            continue
        wav = decode_audio(os.path.join(a.out, rel), sampling_rate=16000)
        dur = len(wav) / 16000
        if dur < a.min or dur > a.max:
            continue
        segs, _ = model.transcribe(wav, language='de', beam_size=5, vad_filter=True,
                                   condition_on_previous_text=False)
        text = ' '.join(s.text.strip() for s in segs).strip()
        if text:
            res[key] = text
        n += 1
        if n % 25 == 0:
            json.dump(res, open(tp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
            print(n, f'{time.time()-t0:.0f}s', key, text[:60], flush=True)
json.dump(res, open(tp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('done', len(res), f'{time.time()-t0:.0f}s')
