// Cek lingkungan: node pipeline/doctor.mjs
import { spawnSync } from 'node:child_process';
import { findPython } from './py.mjs';

const checks = [
  ['node', ['--version'], (v) => Number(v.replace('v', '').split('.')[0]) >= 22, 'Node 22 atau lebih baru'],
  ['ffmpeg', ['-version'], (v) => /ffmpeg version/.test(v), 'FFmpeg ada di PATH'],
  ['ffprobe', ['-version'], (v) => /ffprobe version/.test(v), 'ffprobe ada di PATH'],
];
let bad = 0;
for (const [cmd, args, ok, label] of checks) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  const out = (r.stdout || r.stderr || '').split('\n')[0];
  const pass = r.status === 0 && ok(out);
  if (!pass) bad++;
  console.log(`${pass ? 'OK  ' : 'GAGAL'}  ${label}  ${pass ? '(' + out.trim() + ')' : ''}`);
}

const py = findPython();
if (py) {
  console.log(`OK    Python 3.10 atau lebih baru  (${py.version} via ${py.cmd})`);
  const np = spawnSync(py.cmd, ['-c', 'import numpy; print(numpy.__version__)'], { encoding: 'utf8' });
  const okNp = np.status === 0;
  if (!okNp) bad++;
  console.log(`${okNp ? 'OK  ' : 'GAGAL'}  numpy untuk sound lab  ${okNp ? '(' + np.stdout.trim() + ')' : ''}`);
  const sp = spawnSync(py.cmd, ['-c', 'import scipy; print(scipy.__version__)'], { encoding: 'utf8' });
  const okSp = sp.status === 0;
  if (!okSp) bad++;
  console.log(`${okSp ? 'OK  ' : 'GAGAL'}  scipy untuk sound lab (loudness)  ${okSp ? '(' + sp.stdout.trim() + ')' : ''}`);
  const pil = spawnSync(py.cmd, ['-c', 'import PIL; print(PIL.__version__)'], { encoding: 'utf8' });
  console.log(
    pil.status === 0
      ? `OK    Pillow (PIL) untuk contact sheet  (${pil.stdout.trim()})`
      : 'INFO  Pillow (PIL) belum terpasang (opsional; dibutuhkan oleh pipeline/make_sheet.py).',
  );
} else {
  bad += 3;
  console.log('GAGAL  Python 3.10 atau lebih baru');
  console.log('GAGAL  numpy untuk sound lab');
  console.log('GAGAL  scipy untuk sound lab (loudness)');
}

console.log(
  process.env.REMOTION_TMP
    ? `OK    REMOTION_TMP = ${process.env.REMOTION_TMP}`
    : 'INFO  REMOTION_TMP belum diset, temp bundle akan ke folder sistem.',
);
process.exit(bad ? 1 : 0);
