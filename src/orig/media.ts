// playSmacker(name): the original story videos (Video\<name>.smk, converted to orig/video/<name>.mp4).
//
// Original (Sound Engine / playSmacker): cursor #Wait, fade out sound channels 1–4 (max 1.5 s),
// stop 1–8, play the video zoomed into the scene area (800x448 below the 45 px banner),
// ESC / Space abort (SmackSetInterfaceKeys "\e\s"). Afterwards the movie's Music/Ambient
// controllers are restarted by the caller (scene re-enter / applyMovieAudio()).
//
// Web: a modal overlay over the whole page with the video letterboxed in an 800:448 box.
// Space / Escape / Enter / click / tap skip (when skippable). If autoplay is blocked a big play
// button is shown (tapping it is the user gesture). Resolves when done; resolves immediately when
// the originals (or the video) are missing.

import { videoUrl } from './assets';
import { fadeOutAll, getVolumes, unlock } from './sound';

let playing = false;

/** true while a video overlay is open */
export function isSmackerPlaying(): boolean {
  return playing;
}

/** true if the original video exists */
export function hasSmacker(name: string): boolean {
  return !!videoUrl(name);
}

export interface SmackerOptions {
  /** ESC/Space/click abort (default true, like the original) */
  skippable?: boolean;
  /** fade time for running music/ambience/voice before the video starts (ms, default 800) */
  fadeMs?: number;
}

export async function playSmacker(name: string, opts: SmackerOptions = {}): Promise<void> {
  const url = videoUrl(name);
  if (!url || typeof document === 'undefined') return;
  const skippable = opts.skippable ?? true;
  playing = true;
  unlock();
  const overlay = document.createElement('div');
  overlay.className = 'smk-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', `Film: ${name}`);
  const box = document.createElement('div');
  box.className = 'smk-box';
  const video = document.createElement('video');
  video.className = 'smk-video';
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.preload = 'auto';
  video.disablePictureInPicture = true;
  video.controls = false;
  video.src = url;
  const v = getVolumes();
  video.volume = Math.min(1, Math.max(v.effect, v.voice) / 255);
  box.append(video);
  overlay.append(box);
  if (skippable) {
    const hint = document.createElement('div');
    hint.className = 'smk-hint';
    hint.textContent = 'Überspringen: Leertaste, Esc oder Tippen';
    overlay.append(hint);
  }
  document.body.append(overlay);
  const fade = fadeOutAll(opts.fadeMs ?? 800);

  await new Promise<void>((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      document.removeEventListener('keydown', onKey, true);
      try {
        video.pause();
      } catch {
        /* ignore */
      }
      video.removeAttribute('src');
      try {
        video.load();
      } catch {
        /* ignore */
      }
      overlay.remove();
      playing = false;
      resolve();
    };
    const onKey = (e: KeyboardEvent) => {
      // the overlay is modal: swallow all keys, abort on Esc/Space/Enter
      e.stopPropagation();
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter' || e.key === 'Spacebar') {
        e.preventDefault();
        if (skippable) finish();
      }
    };
    document.addEventListener('keydown', onKey, true);
    video.addEventListener('ended', finish);
    video.addEventListener('error', finish);
    let playBtn: HTMLButtonElement | null = null;
    overlay.addEventListener('click', (e) => {
      if (playBtn && (e.target === playBtn || playBtn.contains(e.target as Node))) return;
      if (skippable) finish();
    });
    const start = () => {
      video.play().then(
        () => {
          playBtn?.remove();
          playBtn = null;
        },
        () => {
          // autoplay with sound blocked: ask for a tap (user gesture)
          if (finished || playBtn) return;
          playBtn = document.createElement('button');
          playBtn.type = 'button';
          playBtn.className = 'smk-play';
          playBtn.setAttribute('aria-label', 'Film abspielen');
          playBtn.textContent = '▶';
          playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            unlock();
            video.play().then(
              () => {
                playBtn?.remove();
                playBtn = null;
              },
              () => finish(),
            );
          });
          overlay.append(playBtn);
          playBtn.focus();
        },
      );
    };
    // start right away when we are still inside the user gesture; the fade runs in parallel
    start();
    void fade;
  });
}
