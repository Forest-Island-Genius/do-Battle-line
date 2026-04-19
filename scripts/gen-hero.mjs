#!/usr/bin/env node
// Nine Banners — Nano Banana hero image generator via fal.ai REST API.
//
// Usage:
//   export FAL_KEY=your_fal_api_key
//   node scripts/gen-hero.mjs [targets...]
//
// Targets (default: all):
//   hero       → src/assets/hero.png       (1536x1024 landscape)
//   parchment  → src/assets/parchment.png  (1024x1024 square board texture)
//   logo       → src/assets/wordmark.png   (1024x512 title wordmark)
//
// Requires Node 18+ (global fetch).

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ASSETS_DIR = resolve(ROOT, 'src/assets');

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
    console.error('✗ FAL_KEY environment variable is required.');
    console.error('  Get one at https://fal.ai and run: export FAL_KEY=...');
    process.exit(1);
}

const MODEL = 'fal-ai/nano-banana';

const TARGETS = {
    hero: {
        file: 'hero.png',
        image_size: 'landscape_16_9',
        prompt: [
            'Epic heraldic scene: nine tall ornate banners planted in formation',
            'on a misty battlefield hill at dusk. Each banner a different deep',
            'jewel color (navy, crimson, forest green, royal purple, gold)',
            'bearing heraldic crests — lion, eagle, sword, crown, dragon.',
            'Painterly oil-painting style, dramatic rim lighting, distant',
            'mountains, moody cinematic atmosphere, rich textured fabric.',
            'No text, no logos, no watermarks.',
        ].join(' '),
    },
    parchment: {
        file: 'parchment.png',
        image_size: 'square_hd',
        prompt: [
            'Aged parchment texture with faint battlefield-map inked lines,',
            'subtle topographic contours, gold foil edge highlights, softly',
            'burned corners. Warm sepia tones that layer well under a dark UI.',
            'No text, no illustrations, just the background surface.',
        ].join(' '),
    },
    logo: {
        file: 'wordmark.png',
        image_size: 'landscape_4_3',
        prompt: [
            'Wordmark reading "NINE BANNERS" in heavy medieval blackletter',
            'inspired serif lettering, deep crimson fill with gold outline,',
            'flanked by a small heraldic shield with two crossed banners.',
            'Premium emblem design, isolated on a deep navy background.',
        ].join(' '),
    },
};

async function submit(prompt, image_size) {
    const res = await fetch(`https://queue.fal.run/${MODEL}`, {
        method: 'POST',
        headers: {
            'Authorization': `Key ${FAL_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, image_size, num_images: 1 }),
    });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Queue submit failed ${res.status}: ${body}`);
    }
    return res.json();
}

async function poll(statusUrl) {
    for (let i = 0; i < 120; i++) {
        const r = await fetch(statusUrl, {
            headers: { 'Authorization': `Key ${FAL_KEY}` },
        });
        const j = await r.json();
        if (j.status === 'COMPLETED') return j;
        if (j.status === 'FAILED') throw new Error(`Job failed: ${JSON.stringify(j)}`);
        process.stdout.write('.');
        await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error('Timed out waiting for generation');
}

async function fetchResult(responseUrl) {
    const r = await fetch(responseUrl, {
        headers: { 'Authorization': `Key ${FAL_KEY}` },
    });
    if (!r.ok) throw new Error(`Result fetch failed ${r.status}`);
    return r.json();
}

async function runTarget(key) {
    const t = TARGETS[key];
    if (!t) throw new Error(`Unknown target: ${key}`);
    console.log(`\n▶ ${key} → ${t.file}`);
    console.log(`  ${t.prompt.slice(0, 80)}...`);

    const submitted = await submit(t.prompt, t.image_size);
    const { status_url, response_url } = submitted;

    process.stdout.write('  waiting');
    await poll(status_url);
    const result = await fetchResult(response_url);

    const imgUrl = result.images?.[0]?.url;
    if (!imgUrl) throw new Error(`No image in result: ${JSON.stringify(result)}`);

    const imgRes = await fetch(imgUrl);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    await mkdir(ASSETS_DIR, { recursive: true });
    const outPath = resolve(ASSETS_DIR, t.file);
    await writeFile(outPath, buf);
    console.log(`\n  ✓ saved ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
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
