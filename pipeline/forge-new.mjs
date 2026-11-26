// Buat produksi baru dari _starter: node pipeline/forge-new.mjs <slug> ["Judul"]
import { cpSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';

const [slug, title] = process.argv.slice(2);
if (!slug || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(slug) || slug === 'starter') {
  console.error(
    'Slug harus kebab-case (huruf kecil, angka, tanda hubung tunggal di tengah, bukan "starter"). Contoh: npm run forge:new -- jembatan-roboh "Jembatan Roboh"',
  );
  process.exit(1);
}
const pascal = slug.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('');
const camel = pascal[0].toLowerCase() + pascal.slice(1);
const screaming = slug.replaceAll('-', '_').toUpperCase();
const src = path.join(ROOT, 'productions/_starter');
const dst = path.join(ROOT, 'productions', slug);
if (existsSync(dst)) {
  console.error(`productions/${slug} sudah ada.`);
  process.exit(1);
}

const regPath = path.join(ROOT, 'productions/registry.ts');
const regRaw = readFileSync(regPath, 'utf8');
if (!regRaw.includes('// @forge:imports') || !regRaw.includes('// @forge:register')) {
  console.error('Marker // @forge:imports atau // @forge:register tidak ditemukan di productions/registry.ts.');
  process.exit(1);
}
if (
  new RegExp(`\\b${pascal}Production\\b`).test(regRaw) ||
  new RegExp(`\\b${camel}Meta\\b`).test(regRaw) ||
  regRaw.includes(`'./${slug}'`)
) {
  console.error(
    `Simbol ${pascal}Production / ${camel}Meta atau modul '${slug}' sudah terdaftar di productions/registry.ts (pilih slug unik lain).`,
  );
  process.exit(1);
}

cpSync(src, dst, { recursive: true });

const displayTitle = title ?? pascal;
const safeTitle = JSON.stringify(displayTitle);
const rewrite = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) {
      rewrite(p);
      continue;
    }
    if (!/\.(ts|tsx|md)$/.test(name)) continue;
    let t = readFileSync(p, 'utf8');
    t = t
      .replaceAll('StarterProduction', () => `${pascal}Production`)
      .replaceAll('StarterSubChunk', () => `${pascal}SubChunk`)
      .replaceAll('buildStarterSubtitles', () => `build${pascal}Subtitles`)
      .replaceAll('starterMeta', () => `${camel}Meta`)
      .replaceAll('STARTER_SPOTS', () => `${screaming}_SPOTS`)
      .replaceAll('STARTER_OBSTACLES', () => `${screaming}_OBSTACLES`)
      .replaceAll("'starter/voice.wav'", () => `'${slug}/voice.wav'`)
      .replaceAll("id: 'starter'", () => `id: '${slug}'`)
      .replaceAll("title: 'Starter'", () => `title: ${safeTitle}`)
      .replaceAll('— Starter', () => `— ${displayTitle}`)
      .replaceAll('`starter`', () => `\`${slug}\``);
    writeFileSync(p, t);
  }
};
rewrite(dst);

const eol = regRaw.includes('\r\n') ? '\r\n' : '\n';
const reg = regRaw
  .replace(
    '// @forge:imports',
    () => `import { ${pascal}Production, ${camel}Meta } from './${slug}';${eol}// @forge:imports`,
  )
  .replace(
    '// @forge:register',
    () => `{ meta: ${camel}Meta, Component: ${pascal}Production },${eol}  // @forge:register`,
  );
writeFileSync(regPath, reg);

console.log(`Produksi baru: productions/${slug}`);
console.log('Langkah berikut: isi brief.md, lalu jalankan agent showrunner.');
