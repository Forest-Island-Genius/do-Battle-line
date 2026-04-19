#!/usr/bin/env node
// Nine Banners — Gemini (Nano Banana) image generator.
//
// Usage:
//   export GEMINI_API_KEY=your_key_from_aistudio.google.com/apikey
//   node scripts/gen-hero.mjs [targets...]
//
// Targets (default: all):
//   hero       → src/assets/hero.png       (landscape battlefield scene)
//   parchment  → src/assets/parchment.png  (square board texture)
//   wordmark   → src/assets/wordmark.png   (NINE BANNERS title)
//
// Model: gemini-2.5-flash-image (a.k.a. "Nano Banana").

import { GoogleGenAI } from '@google/genai';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ASSETS_DIR = resolve(ROOT, 'src/assets');

// .env.local / .env から GEMINI_API_KEY を読み込む (dotenv 依存なし)
for (const fname of ['.env.local', '.env']) {
    const fpath = resolve(ROOT, fname);
    if (!existsSync(fpath)) continue;
    const text = await readFile(fpath, 'utf8');
    for (const line of text.split('\n')) {
        const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
        if (!m) continue;
        const [, key, rawVal] = m;
        if (process.env[key]) continue; // シェル env を優先
        const val = rawVal.replace(/^["']|["']$/g, '');
        process.env[key] = val;
    }
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error('✗ GEMINI_API_KEY is required.');
    console.error('  Get one at https://aistudio.google.com/apikey');
    console.error('  Then: export GEMINI_API_KEY=your_key');
    process.exit(1);
}

const MODEL = 'gemini-2.5-flash-image';

const TARGETS = {
    hero: {
        file: 'hero.png',
        prompt: [
            'Epic heraldic battlefield scene, landscape 16:9 composition.',
            'Nine tall ornate medieval banners planted in a staggered line',
            'on a misty dusk battlefield hill — each banner bearing a unique',
            'heraldic crest (roaring lion, soaring eagle, crossed swords,',
            'crowned stag, coiled dragon, rising sun, wolf, falcon, oak).',
            'Banner colors span deep jewel tones: navy, crimson, forest',
            'green, royal purple, burnished gold, sable, argent, murrey,',
            'azure. Painterly oil-on-canvas rendering, dramatic warm rim',
            'lighting from the horizon, distant mountain range, low drifting',
            'fog, rich fabric textures with visible weave, restrained',
            'cinematic grading, no humans, no modern elements.',
            'No text, no logos, no watermarks, no signatures.',
        ].join(' '),
    },
    parchment: {
        file: 'parchment.png',
        prompt: [
            'Aged parchment battlefield map texture, square composition,',
            'tileable. Warm sepia and ivory base with faint inked topographic',
            'contours and a very subtle grid. Soft gold-leaf edge',
            'illumination, gently scorched corners, mild staining and crease',
            'shadows. Designed to sit behind a dark UI — contrast muted so',
            'overlay elements remain legible. No illustrations, no figures,',
            'no text of any kind, just the background surface.',
        ].join(' '),
    },
    wordmark: {
        file: 'wordmark.png',
        prompt: [
            'Premium wordmark reading exactly "NINE BANNERS" in a heavy',
            'medieval blackletter-inspired serif. Deep crimson fill with a',
            'thin burnished gold outline, ornate drop caps on "N" and "B",',
            'flanked by a small heraldic shield with two crossed banners on',
            'either side of the text. Isolated on a deep navy background,',
            'subtle gold rule above and below the text. Crisp, centered,',
            'print-ready, no additional words, no taglines.',
        ].join(' '),
    },
};

const ai = new GoogleGenAI({ apiKey });

async function runTarget(key) {
    const t = TARGETS[key];
    if (!t) throw new Error(`Unknown target: ${key}`);

    console.log(`\n▶ ${key} → ${t.file}`);
    console.log(`  ${t.prompt.slice(0, 90)}…`);

    const response = await ai.models.generateContent({
        model: MODEL,
        contents: t.prompt,
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find(p => p.inlineData?.data);

    if (!imagePart) {
        const textPart = parts.find(p => p.text)?.text ?? '(no text)';
        throw new Error(`No image returned. Model said: ${textPart.slice(0, 200)}`);
    }

    const buf = Buffer.from(imagePart.inlineData.data, 'base64');
    await mkdir(ASSETS_DIR, { recursive: true });
    const outPath = resolve(ASSETS_DIR, t.file);
    await writeFile(outPath, buf);
    console.log(`  ✓ saved ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
}

const requested = process.argv.slice(2);
const keys = requested.length ? requested : Object.keys(TARGETS);

for (const k of keys) {
    try {
        await runTarget(k);
    } catch (e) {
        console.error(`✗ ${k} failed:`, e.message);
        process.exitCode = 1;
    }
}
console.log('\nDone.');
