// ── STATE ──
let selectedFile = null;
let selectedLevel = null;

// ── COMPRESSION SETTINGS per level ──
const settings = {
  low:    { imageQuality: 0.8,  scaleFactor: 1.0  },
  medium: { imageQuality: 0.5,  scaleFactor: 0.75 },
  high:   { imageQuality: 0.2,  scaleFactor: 0.5  }
};

// ── HELPERS ──
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
  return (bytes / 1073741824).toFixed(3) + ' GB';
}

function getExt(file) {
  return file.name.split('.').pop().toLowerCase();
}

function getIcon(ext) {
  const icons = {
    pdf: '📕', doc: '📘', docx: '📘',
    xls: '📗', xlsx: '📗',
    jpg: '🖼️', jpeg: '🖼️', png: '🌅', webp: '🖼️',
    txt: '📝', csv: '📊', zip: '🗜️'
  };
  return icons[ext] || '📄';
}

// ── FILE UPLOAD ──
const dropzone  = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');

dropzone.addEventListener('dragover', function(e) {
  e.preventDefault();
  dropzone.style.borderColor = '#5b6ef5';
});

dropzone.addEventListener('dragleave', function() {
  dropzone.style.borderColor = '';
});

dropzone.addEventListener('drop', function(e) {
  e.preventDefault();
  dropzone.style.borderColor = '';
  if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', function() {
  if (fileInput.files[0]) loadFile(fileInput.files[0]);
});

function loadFile(file) {
  selectedFile = file;
  document.getElementById('fileIcon').textContent = getIcon(getExt(file));
  document.getElementById('fileName').textContent = file.name;
  document.getElementById('fileSize').textContent = formatBytes(file.size);
  document.getElementById('fileInfo').classList.add('show');
  hideResult();
  hideError();
  checkReady();
}

document.getElementById('removeFile').addEventListener('click', function() {
  selectedFile = null;
  document.getElementById('fileInfo').classList.remove('show');
  fileInput.value = '';
  hideResult();
  hideError();
  checkReady();
});

// ── LEVEL SELECT ──
document.querySelectorAll('.level-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.level-btn').forEach(function(b) {
      b.classList.remove('active');
    });
    btn.classList.add('active');
    selectedLevel = btn.dataset.level;
    hideResult();
    hideError();
    checkReady();
  });
});

// ── CHECK READY ──
function checkReady() {
  const btn = document.getElementById('compressBtn');
  if (selectedFile && selectedLevel) {
    btn.disabled = false;
    btn.textContent = 'Compress ' + getExt(selectedFile).toUpperCase()
      + ' — ' + selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1) + ' compression';
  } else {
    btn.disabled = true;
    btn.textContent = 'Select a file and level first';
  }
}

// ── PROGRESS ──
function showProgress(pct, msg) {
  document.getElementById('progressWrap').classList.add('show');
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = msg;
}

function hideProgress() {
  document.getElementById('progressWrap').classList.remove('show');
}

function showResult(filename, blob) {
  const url = URL.createObjectURL(blob);
  const saved = selectedFile.size - blob.size;
  const savedPct = Math.round((saved / selectedFile.size) * 100);

  document.getElementById('resultName').textContent = filename;
  document.getElementById('resultStats').textContent =
    formatBytes(selectedFile.size) + ' → ' + formatBytes(blob.size);

  const dl = document.getElementById('downloadLink');
  dl.href = url;
  dl.download = filename;

  document.getElementById('origSize').textContent = formatBytes(selectedFile.size);
  document.getElementById('newSize').textContent = formatBytes(blob.size);
  document.getElementById('savedSize').textContent = savedPct + '% saved';

  document.getElementById('result').classList.add('show');
  document.getElementById('comparison').classList.add('show');
}

function hideResult() {
  document.getElementById('result').classList.remove('show');
  document.getElementById('comparison').classList.remove('show');
}

function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = '⚠ ' + msg;
  el.classList.add('show');
}

function hideError() {
  document.getElementById('errorMsg').classList.remove('show');
}

// ── MAIN COMPRESS BUTTON ──
document.getElementById('compressBtn').addEventListener('click', async function() {
  if (!selectedFile || !selectedLevel) return;

  hideResult();
  hideError();

  const btn = document.getElementById('compressBtn');
  btn.disabled = true;
  btn.textContent = 'Compressing…';

  try {
    const ext   = getExt(selectedFile);
    const level = settings[selectedLevel];
    const baseName = selectedFile.name.replace(/\.[^.]+$/, '');
    let outputBlob = null;
    let outputName = selectedFile.name;

    showProgress(10, 'Reading file…');
    const arrayBuffer = await selectedFile.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    showProgress(40, 'Compressing…');

    // ── IMAGE COMPRESSION ──
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      outputBlob = await compressImage(selectedFile, level.imageQuality, level.scaleFactor);
      outputName = baseName + '_compressed.' + ext;
    }

    // ── TEXT FILE COMPRESSION (remove extra whitespace) ──
    else if (['txt', 'csv'].includes(ext)) {
      const text = new TextDecoder().decode(bytes);
      let compressed = text;
      if (selectedLevel === 'medium') {
        compressed = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
      } else if (selectedLevel === 'high') {
        compressed = text.replace(/[ \t]+/g, ' ').replace(/\n+/g, '\n').trim();
      }
      outputBlob = new Blob([compressed], { type: selectedFile.type });
      outputName = baseName + '_compressed.' + ext;
    }

    // ── DOCX COMPRESSION (re-pack with stripped whitespace) ──
    else if (ext === 'docx') {
      outputBlob = await compressDocx(bytes, selectedLevel);
      outputName = baseName + '_compressed.docx';
    }

    // ── PDF / ZIP / OTHER — ZIP compress ──
    else {
      outputBlob = await zipCompress(bytes, selectedFile.name, selectedLevel);
      outputName = baseName + '_compressed.zip';
    }

    showProgress(90, 'Finalising…');
    await new Promise(function(r) { setTimeout(r, 300); });
    showProgress(100, 'Done!');
    await new Promise(function(r) { setTimeout(r, 200); });

    hideProgress();
    showResult(outputName, outputBlob);

  } catch (err) {
    hideProgress();
    showError('Compression failed: ' + err.message);
    console.error(err);
  }

  btn.disabled = false;
  checkReady();
});

// ── IMAGE COMPRESSOR ──
function compressImage(file, quality, scale) {
  return new Promise(function(resolve, reject) {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

      const ext  = getExt(file);
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

      canvas.toBlob(function(blob) {
        URL.revokeObjectURL(url);
        resolve(blob);
      }, mime, quality);
    };

    img.onerror = function() { reject(new Error('Cannot read image')); };
    img.src = url;
  });
}

// ── DOCX COMPRESSOR (strip whitespace from XML) ──
async function compressDocx(bytes, level) {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  let compressed = text;

  if (level === 'medium' || level === 'high') {
    compressed = text
      .replace(/>\s+</g, '><')
      .replace(/\s{2,}/g, ' ');
  }

  return new Blob([new TextEncoder().encode(compressed)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
}

// ── ZIP COMPRESSOR (wrap any file in a zip) ──
async function zipCompress(bytes, filename, level) {
  // Build a minimal ZIP (store method — browser cannot do DEFLATE natively)
  function u16(n) { return [n & 0xff, (n >> 8) & 0xff]; }
  function u32(n) { return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]; }

  function crc32(data) {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c;
    }
    let c = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) c = t[(c ^ data[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  const nameBytes = new TextEncoder().encode(filename);
  const crc       = crc32(bytes);

  const localHeader = new Uint8Array([
    0x50, 0x4B, 0x03, 0x04,
    0x14, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    ...u32(crc),
    ...u32(bytes.length),
    ...u32(bytes.length),
    ...u16(nameBytes.length),
    ...u16(0)
  ]);

  const centralDir = new Uint8Array([
    0x50, 0x4B, 0x01, 0x02,
    0x14, 0x00, 0x14, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    ...u32(crc),
    ...u32(bytes.length),
    ...u32(bytes.length),
    ...u16(nameBytes.length),
    ...u16(0), ...u16(0), ...u16(0), ...u16(0),
    ...u32(0), ...u32(0),
    ...nameBytes
  ]);

  const localSize = localHeader.length + nameBytes.length + bytes.length;

  const eocd = new Uint8Array([
    0x50, 0x4B, 0x05, 0x06,
    0x00, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x01, 0x00,
    ...u32(centralDir.length),
    ...u32(localSize),
    ...u16(0)
  ]);

  const total = localHeader.length + nameBytes.length + bytes.length + centralDir.length + eocd.length;
  const buf   = new Uint8Array(total);
  let pos = 0;

  buf.set(localHeader, pos); pos += localHeader.length;
  buf.set(nameBytes,   pos); pos += nameBytes.length;
  buf.set(bytes,       pos); pos += bytes.length;
  buf.set(centralDir,  pos); pos += centralDir.length;
  buf.set(eocd,        pos);

  return new Blob([buf], { type: 'application/zip' });
}