// SVG → webp at the exact member size (resvg + sharp), with the pack fonts (Baloo 2, Nunito).

import { createRequire } from 'node:module';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { ROOT } from './api';

const require = createRequire(import.meta.url);
function fontPath(pkg: string, file: string): string {
  return join(require.resolve(`${pkg}/package.json`, { paths: [ROOT] }), '..', ...file.split('/'));
}

export const FONT_FILES = [
  fontPath('@expo-google-fonts/baloo-2', '800ExtraBold/Baloo2_800ExtraBold.ttf'),
  fontPath('@expo-google-fonts/baloo-2', '700Bold/Baloo2_700Bold.ttf'),
  fontPath('@expo-google-fonts/nunito', '700Bold/Nunito_700Bold.ttf'),
  fontPath('@expo-google-fonts/nunito', '800ExtraBold/Nunito_800ExtraBold.ttf'),
  fontPath('@expo-google-fonts/nunito', '900Black/Nunito_900Black.ttf'),
];

/** render an SVG document to RGBA PNG; checks the size */
export function svgToPng(svg: string, w: number, h: number): Buffer {
  const r = new Resvg(svg, {
    fitTo: { mode: 'original' },
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Nunito' },
    shapeRendering: 2,
    textRendering: 1,
  });
  const img = r.render();
  if (img.width !== w || img.height !== h) throw new Error(`rendered ${img.width}x${img.height}, expected ${w}x${h}`);
  return img.asPng();
}

/** PNG → webp; picks the smaller of lossless and high-quality lossy */
export async function pngToWebp(png: Buffer): Promise<Buffer> {
  // lossless keeps flat colours exact (part members must match their body pixel for pixel);
  // only big, textured images (backgrounds) go lossy
  const lossless = await sharp(png).webp({ lossless: true, effort: 5 }).toBuffer();
  if (lossless.length < 40000) return lossless;
  const lossy = await sharp(png).webp({ quality: 90, alphaQuality: 100, effort: 5, smartSubsample: true }).toBuffer();
  return lossy.length < lossless.length * 0.6 ? lossy : lossless;
}
