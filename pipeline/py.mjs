// Temukan biner Python 3.10+ yang benar-benar bisa dijalankan (lewati stub WindowsApps di Windows).
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function candidates() {
  const list = [];
  if (process.env.PYTHON) list.push(process.env.PYTHON);
  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA;
    if (local) {
      list.push(path.join(local, 'Python', 'bin', 'python3.exe'));
      list.push(path.join(local, 'Python', 'bin', 'python.exe'));
      const prog = path.join(local, 'Programs', 'Python');
      if (existsSync(prog)) {
        for (const d of readdirSync(prog).sort().reverse()) {
          list.push(path.join(prog, d, 'python.exe'));
        }
      }
    }
  }
  list.push('python3', 'python');
  return [...new Set(list)];
}

export function findPython() {
  for (const cmd of candidates()) {
    const r = spawnSync(cmd, ['--version'], { encoding: 'utf8' });
    const out = (r.stdout || r.stderr || '').split('\n')[0].trim();
    const m = out.match(/Python 3\.(\d+)/);
    if (r.status === 0 && m && Number(m[1]) >= 10) {
      return { cmd, version: out };
    }
  }
  return null;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const py = findPython();
  if (!py) {
    console.error('Python 3.10+ tidak ditemukan di PATH maupun folder instalasi standar.');
    process.exit(1);
  }
  const r = spawnSync(py.cmd, process.argv.slice(2), { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}
