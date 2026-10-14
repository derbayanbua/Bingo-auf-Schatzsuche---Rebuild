// Neutral, clearly recognisable placeholder for members without new art (never original pixels).

import type { Member } from './api';
import { esc, svgDoc } from './svg';

export function placeholderSvg(m: Member): string {
  const { w, h } = m;
  const sw = Math.max(1, Math.min(3, Math.min(w, h) / 20));
  const fsz = Math.max(7, Math.min(16, w / Math.max(6, m.name.length * 0.62)));
  const showText = w >= 40 && h >= 16;
  const id = 'ph';
  const body = `<defs><pattern id="${id}" patternUnits="userSpaceOnUse" width="12" height="12" patternTransform="rotate(45)">` +
    `<rect width="12" height="12" fill="#e7e3ee"/><rect width="6" height="12" fill="#d9d3e4"/></pattern></defs>` +
    `<rect x="${sw / 2}" y="${sw / 2}" width="${Math.max(0, w - sw)}" height="${Math.max(0, h - sw)}" rx="${Math.min(8, w / 6, h / 6)}" fill="url(#${id})" fill-opacity="0.85" stroke="#9b8fb3" stroke-width="${sw}" stroke-dasharray="${sw * 3} ${sw * 2}"/>` +
    (showText
      ? `<text x="${w / 2}" y="${h / 2}" font-family="Nunito" font-weight="700" font-size="${fsz}" fill="#6f6585" text-anchor="middle" dominant-baseline="central">${esc(m.name)}</text>`
      : '');
  return svgDoc(w, h, body);
}
