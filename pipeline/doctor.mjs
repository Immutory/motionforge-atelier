// Cek lingkungan: node pipeline/doctor.mjs
import { spawnSync } from 'node:child_process';

const checks = [
  ['node', ['--version'], (v) => Number(v.replace('v', '').split('.')[0]) >= 18, 'Node 18 atau lebih baru'],
  ['python3', ['--version'], (v) => /Python 3\.(\d+)/.test(v) && Number(v.match(/3\.(\d+)/)[1]) >= 10, 'Python 3.10 atau lebih baru'],
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
const py = spawnSync('python3', ['-c', 'import numpy; print(numpy.__version__)'], { encoding: 'utf8' });
console.log(`${py.status === 0 ? 'OK  ' : 'GAGAL'}  numpy untuk sound lab ${py.status === 0 ? '(' + py.stdout.trim() + ')' : ''}`);
if (py.status !== 0) bad++;
console.log(process.env.REMOTION_TMP ? `OK    REMOTION_TMP = ${process.env.REMOTION_TMP}` : 'INFO  REMOTION_TMP belum diset, temp bundle akan ke folder sistem.');
process.exit(bad ? 1 : 0);
