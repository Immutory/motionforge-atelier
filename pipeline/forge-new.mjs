// Buat produksi baru dari _starter: node pipeline/forge-new.mjs <slug> ["Judul"]
import { cpSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';

const [slug, title] = process.argv.slice(2);
if (!slug || !/^[a-z][a-z0-9-]*$/.test(slug)) {
  console.error('Slug harus huruf kecil, angka, atau tanda hubung. Contoh: npm run forge:new -- jembatan-roboh "Jembatan Roboh"');
  process.exit(1);
}
const pascal = slug.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('');
const camel = pascal[0].toLowerCase() + pascal.slice(1);
const src = path.join(ROOT, 'productions/_starter');
const dst = path.join(ROOT, 'productions', slug);
if (existsSync(dst)) { console.error(`productions/${slug} sudah ada.`); process.exit(1); }
cpSync(src, dst, { recursive: true });

const rewrite = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) { rewrite(p); continue; }
    if (!/\.(ts|tsx|md)$/.test(name)) continue;
    let t = readFileSync(p, 'utf8');
    t = t.replaceAll('StarterProduction', `${pascal}Production`)
         .replaceAll('starterMeta', `${camel}Meta`)
         .replaceAll("id: 'starter'", `id: '${slug}'`)
         .replaceAll("title: 'Starter'", `title: '${title ?? pascal}'`);
    writeFileSync(p, t);
  }
};
rewrite(dst);

const regPath = path.join(ROOT, 'productions/registry.ts');
let reg = readFileSync(regPath, 'utf8');
reg = reg.replace('// @forge:imports', `import { ${pascal}Production, ${camel}Meta } from './${slug}';\n// @forge:imports`);
reg = reg.replace('// @forge:register', `{ meta: ${camel}Meta, Component: ${pascal}Production },\n  // @forge:register`);
writeFileSync(regPath, reg);

console.log(`Produksi baru: productions/${slug}`);
console.log('Langkah berikut: isi brief.md, lalu jalankan agent showrunner.');
