// Peluncur VO Engine Lokal (Chatterbox-TTS-Indonesian + faster-whisper CUDA) di .venv-vo
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VENV_PY =
  process.platform === 'win32'
    ? path.join(ROOT, '.venv-vo', 'Scripts', 'python.exe')
    : path.join(ROOT, '.venv-vo', 'bin', 'python');

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
      '  uv pip install --python .venv-vo/Scripts/python.exe torch==2.6.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu124\n' +
      '  uv pip install --python .venv-vo/Scripts/python.exe chatterbox-tts faster-whisper safetensors huggingface_hub soundfile',
  );
  process.exit(1);
}

if (sub === 'doctor') {
  const code = [
    'import shutil, torch',
    'print("Python VO   :", __import__("sys").version.split()[0])',
    'print("PyTorch     :", torch.__version__, "| CUDA:", torch.cuda.is_available(), "| GPU:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU")',
    'print("ffmpeg      :", shutil.which("ffmpeg") or "TIDAK DITEMUKAN")',
    'for pkg in ("chatterbox", "faster_whisper", "safetensors", "huggingface_hub"):',
    '    try:',
    '        __import__(pkg); print(f"{pkg:12s}: OK")',
    '    except Exception as e:',
    '        print(f"{pkg:12s}: BELUM TERPASANG ({e})")',
  ].join('\n');
  const r = spawnSync(VENV_PY, ['-c', code], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}

const script =
  sub === 'gen'
    ? path.join(ROOT, 'pipeline', 'voice', 'tts_local.py')
    : path.join(ROOT, 'pipeline', 'voice', 'align_words.py');

const r = spawnSync(VENV_PY, [script, ...rest], { stdio: 'inherit' });
process.exit(r.status ?? 1);
