// Peluncur VO Engine Lokal (Chatterbox-TTS-Indonesian + faster-whisper CUDA) di .venv-vo
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VENV_REL = process.platform === 'win32' ? '.venv-vo/Scripts/python.exe' : '.venv-vo/bin/python';
const VENV_PY = path.join(ROOT, VENV_REL);

const sub = process.argv[2];
const rest = process.argv.slice(3);

if (!sub || !['gen', 'align', 'doctor'].includes(sub)) {
  console.error('Pakai: node pipeline/vo.mjs <gen|align|doctor> [opsi...]');
  process.exit(1);
}

if (!existsSync(VENV_PY)) {
  console.error(
    `Environment VO lokal (.venv-vo) belum tersedia di ${VENV_PY}.\n` +
      'Buat dengan:\n' +
      '  uv venv --python 3.11 .venv-vo\n' +
      `  uv pip install --python ${VENV_REL} torch==2.6.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu124\n` +
      `  uv pip install --python ${VENV_REL} chatterbox-tts faster-whisper safetensors huggingface_hub soundfile`,
  );
  process.exit(1);
}

if (sub === 'doctor') {
  const code = [
    'import shutil, sys',
    'bad = 0',
    'print("Python VO   :", sys.version.split()[0])',
    'try:',
    '    import torch',
    '    print("PyTorch     :", torch.__version__, "| CUDA:", torch.cuda.is_available(), "| GPU:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU")',
    'except Exception as e:',
    '    bad += 1; print(f"PyTorch     : BELUM TERPASANG ({e})")',
    'ff = shutil.which("ffmpeg")',
    'if not ff: bad += 1',
    'print("ffmpeg      :", ff or "TIDAK DITEMUKAN")',
    'for pkg in ("torchaudio", "chatterbox", "faster_whisper", "safetensors", "huggingface_hub", "soundfile", "perth"):',
    '    try:',
    '        __import__(pkg); print(f"{pkg:15s}: OK")',
    '    except Exception as e:',
    '        bad += 1; print(f"{pkg:15s}: BELUM TERPASANG ({e})")',
    'sys.exit(1 if bad else 0)',
  ].join('\n');
  const r = spawnSync(VENV_PY, ['-c', code], { stdio: 'inherit', env: { ...process.env, PYTHONUTF8: '1' } });
  if (r.error) {
    console.error(`[vo] Gagal menjalankan Python VO: ${r.error.message}`);
    process.exit(1);
  }
  process.exit(r.status ?? 1);
}

const script =
  sub === 'gen'
    ? path.join(ROOT, 'pipeline', 'voice', 'tts_local.py')
    : path.join(ROOT, 'pipeline', 'voice', 'align_words.py');

const r = spawnSync(VENV_PY, [script, ...rest], { stdio: 'inherit', env: { ...process.env, PYTHONUTF8: '1' } });
if (r.error) {
  console.error(`[vo] Gagal menjalankan Python VO: ${r.error.message}`);
  process.exit(1);
}
process.exit(r.status ?? 1);
