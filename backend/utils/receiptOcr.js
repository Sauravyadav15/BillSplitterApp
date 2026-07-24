// backend/utils/receiptOcr.js
// Runs OCR on a receipt image via a long-lived PaddleOCR worker process (see
// backend/paddle_ocr/ocr_server.py) and reconstructs the result into
// reading-order text using each text box's pixel position rather than the
// OCR engine's own output order - see utils/ocrLineBuilder.js for why that's
// what actually keeps an item name and its price on the same line.
// No interpretation of item vs. header here - that's receiptParser.js's job.
//
// The worker is spawned once (lazily, on first use) and reused for every
// request after that. PaddleOCR's model load alone takes 20-30+ seconds -
// spawning a fresh process per request (as a naive execFile call would) pays
// that cost on every single receipt scan, which was measured as
// unusably slow. A persistent worker pays it once.

const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');
const { buildLinesFromBoxes } = require('./ocrLineBuilder');

const VENV_DIR = path.join(__dirname, '..', 'paddle_ocr', '.venv_paddleocr');

// Overridable via env for deployments where the venv isn't at the default
// dev-machine path (e.g. a container that builds it elsewhere).
const PADDLE_PYTHON =
  process.env.PADDLE_OCR_PYTHON ||
  path.join(VENV_DIR, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');

const OCR_SERVER_SCRIPT = path.join(__dirname, '..', 'paddle_ocr', 'ocr_server.py');

// A single request can legitimately take a while under memory pressure
// (observed well over a minute on a loaded machine) - this bounds how long
// we wait for a response before giving up on that request, not how long
// startup is allowed to take.
const REQUEST_TIMEOUT_MS = 180000;

let worker = null;

function spawnWorker() {
  const child = spawn(PADDLE_PYTHON, [OCR_SERVER_SCRIPT], {
    cwd: path.dirname(OCR_SERVER_SCRIPT),
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const state = {
    child,
    pending: new Map(),
    nextId: 1,
    ready: null,
  };

  const rl = readline.createInterface({ input: child.stdout });

  let resolveReady;
  let rejectReady;
  state.ready = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  let sawReady = false;
  rl.on('line', (line) => {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      return; // ignore stray non-JSON output
    }

    if (!sawReady) {
      sawReady = true;
      if (message.ready) {
        resolveReady();
      } else {
        rejectReady(new Error('PaddleOCR worker sent an unexpected startup message'));
      }
      return;
    }

    const pending = state.pending.get(message.id);
    if (!pending) return;
    state.pending.delete(message.id);

    if (message.error) {
      pending.reject(new Error(`PaddleOCR worker error: ${message.error}`));
    } else {
      pending.resolve(message.boxes);
    }
  });

  const fail = (err) => {
    if (!sawReady) rejectReady(err);
    for (const pending of state.pending.values()) {
      pending.reject(err);
    }
    state.pending.clear();
    if (worker === state) worker = null;
  };

  child.on('error', fail);
  child.on('exit', (code) => {
    fail(new Error(`PaddleOCR worker exited unexpectedly (code ${code})`));
  });

  return state;
}

function getWorker() {
  if (!worker) {
    worker = spawnWorker();
  }
  return worker;
}

// Call once at server startup so the ~20s model-load cost lands there
// instead of on whichever user's request happens to arrive first.
function warmUp() {
  return getWorker().ready;
}

async function extractTextFromImage(imagePath) {
  const state = getWorker();
  await state.ready;

  const id = String(state.nextId++);
  const boxes = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      state.pending.delete(id);
      reject(new Error('PaddleOCR worker timed out'));
    }, REQUEST_TIMEOUT_MS);

    state.pending.set(id, {
      resolve: (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      reject: (err) => {
        clearTimeout(timer);
        reject(err);
      },
    });

    state.child.stdin.write(JSON.stringify({ id, image_path: path.resolve(imagePath) }) + '\n');
  });

  return buildLinesFromBoxes(boxes);
}

module.exports = { extractTextFromImage, warmUp };
