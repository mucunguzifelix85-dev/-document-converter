// ── TRACK WHAT THE USER SELECTED ──
let selectedFile = null;
let selectedFormat = null;

// ── HELPER: format file size nicely ──
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
  return (bytes / 1073741824).toFixed(3) + ' GB';
}

// ── HELPER: convert size input to bytes ──
function toBytes(value, unit) {
  const v = parseFloat(value);
  if (isNaN(v) || v <= 0) return null;
  const units = { B: 1, KB: 1024, MB: 1048576, GB: 1073741824 };
  return Math.round(v * units[unit]);
}

// ── HELPER: get file extension ──
function getExt(file) {
  return file.name.split('.').pop().toLowerCase();
}

// ── HELPER: get emoji icon for file type ──
function getIcon(ext) {
  const icons = {
    pdf: '📕', doc: '📘', docx: '📘',
    xls: '📗', xlsx: '📗',
    jpg: '🖼️', jpeg: '🖼️', png: '🌅',
    txt: '📝', csv: '📊'
  };
  return icons[ext] || '📄';
}

// ──────────────────────────────────────
//   FILE UPLOAD
// ──────────────────────────────────────

const dropzone  = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');

// When user drags a file over the drop zone
dropzone.addEventListener('dragover', function(e) {
  e.preventDefault();
  dropzone.style.borderColor = '#5b6ef5';
});

// When user leaves the drop zone without dropping
dropzone.addEventListener('dragleave', function() {
  dropzone.style.borderColor = '';
});

// When user drops a file
dropzone.addEventListener('drop', function(e) {
  e.preventDefault();
  dropzone.style.borderColor = '';
  const file = e.dataTransfer.files[0];
  if (file) loadFile(file);
});

// When user clicks and selects a file
fileInput.addEventListener('change', function() {
  if (fileInput.files[0]) loadFile(fileInput.files[0]);
});

// Show file info after selecting
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

// Remove file button
document.getElementById('removeFile').addEventListener('click', function() {
  selectedFile = null;
  document.getElementById('fileInfo').classList.remove('show');
  fileInput.value = '';
  checkReady();
  hideResult();
  hideError();
});

// ──────────────────────────────────────
//   SIZE INPUT
// ──────────────────────────────────────

document.getElementById('sizeValue').addEventListener('input', updateSizeHint);
document.getElementById('sizeUnit').addEventListener('change', updateSizeHint);

function updateSizeHint() {
  const val  = document.getElementById('sizeValue').value;
  const unit = document.getElementById('sizeUnit').value;
  const bytes = toBytes(val, unit);
  const display = document.getElementById('sizeDisplay');

  if (bytes) {
    display.textContent = '→ ' + bytes.toLocaleString() + ' bytes  (' + formatBytes(bytes) + ')';
    display.classList.add('show');
  } else {
    display.classList.remove('show');
  }
}

// ──────────────────────────────────────
//   FORMAT SELECTION
// ──────────────────────────────────────

document.querySelectorAll('.fmt-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    // Remove active from all buttons
    document.querySelectorAll('.fmt-btn').forEach(function(b) {
      b.classList.remove('active');
    });
    // Activate the clicked one
    btn.classList.add('active');
    selectedFormat = btn.dataset.fmt;
    hideResult();
    hideError();
    checkReady();
  });
});

// ──────────────────────────────────────
//   ENABLE/DISABLE CONVERT BUTTON
// ──────────────────────────────────────

function checkReady() {
  const btn = document.getElementById('convertBtn');
  if (selectedFile && selectedFormat) {
    btn.disabled = false;
    btn.textContent = 'Convert '
      + getExt(selectedFile).toUpperCase()
      + ' → '
      + selectedFormat.toUpperCase();
  } else {
    btn.disabled = true;
    btn.textContent = 'Select a file and format first';
  }
}

// ──────────────────────────────────────
//   PROGRESS BAR HELPERS
// ──────────────────────────────────────

function showProgress(percent, message) {
  document.getElementById('progress').classList.add('show');
  document.getElementById('progressFill').style.width = percent + '%';
  document.getElementById('progressText').textContent = message;
}

function hideProgress() {
  document.getElementById('progress').classList.remove('show');
  document.getElementById('progressText').textContent = '';
}

function showResult(filename, blob) {
  const url = URL.createObjectURL(blob);
  document.getElementById('resultName').textContent = filename;
  document.getElementById('resultSize').textContent = formatBytes(blob.size);
  const link = document.getElementById('downloadLink');
  link.href = url;
  link.download = filename;
  document.getElementById('result').classList.add('show');
}

function hideResult() {
  document.getElementById('result').classList.remove('show');
}

function showError(message) {
  const el = document.getElementById('errorMsg');
  el.textContent = '⚠ ' + message;
  el.classList.add('show');
}

function hideError() {
  document.getElementById('errorMsg').classList.remove('show');
}

// ──────────────────────────────────────
//   MAIN CONVERT BUTTON
// ──────────────────────────────────────

document.getElementById('convertBtn').addEventListener('click', async function() {
  if (!selectedFile || !selectedFormat) return;

  hideResult();
  hideError();

  const btn = document.getElementById('convertBtn');
  btn.disabled = true;
  btn.textContent = 'Converting…';

  try {
    const targetBytes = toBytes(
      document.getElementById('sizeValue').value,
      document.getElementById('sizeUnit').value
    );

    const fromExt = getExt(selectedFile);
    const toFmt   = selectedFormat;
    const baseName = selectedFile.name.replace(/\.[^.]+$/, '');
    const outputName = baseName + '.' + toFmt;

    showProgress(10, 'Reading file…');
    const arrayBuffer = await selectedFile.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    showProgress(40, 'Converting…');

    let outputBlob = null;

    // ── XLSX or XLS → CSV ──
    if (['xlsx', 'xls'].includes(fromExt) && toFmt === 'csv') {
      const workbook = XLSX.read(bytes, { type: 'array' });
      const csvText  = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
      outputBlob = new Blob([csvText], { type: 'text/csv' });
    }

    // ── XLSX or XLS → TXT ──
    else if (['xlsx', 'xls'].includes(fromExt) && toFmt === 'txt') {
      const workbook = XLSX.read(bytes, { type: 'array' });
      const txtText  = XLSX.utils.sheet_to_txt(workbook.Sheets[workbook.SheetNames[0]]);
      outputBlob = new Blob([txtText], { type: 'text/plain' });
    }

    // ── CSV → XLSX ──
    else if (fromExt === 'csv' && toFmt === 'xlsx') {
      const text     = new TextDecoder().decode(bytes);
      const workbook = XLSX.read(text, { type: 'string' });
      const xlsxData = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      outputBlob = new Blob([xlsxData], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
    }

    // ── CSV → TXT or TXT → CSV ──
    else if (
      (fromExt === 'csv' && toFmt === 'txt') ||
      (fromExt === 'txt' && toFmt === 'csv')
    ) {
      const mime = toFmt === 'csv' ? 'text/csv' : 'text/plain';
      outputBlob = new Blob([bytes], { type: mime });
    }

    // ── TXT → DOCX ──
    else if (fromExt === 'txt' && toFmt === 'docx') {
      const text = new TextDecoder().decode(bytes);
      outputBlob = convertTxtToDocx(text);
    }

    // ── DOCX → TXT ──
    else if (fromExt === 'docx' && toFmt === 'txt') {
      const text = extractTextFromDocx(bytes);
      outputBlob = new Blob([text], { type: 'text/plain' });
    }

    // ── PDF → TXT ──
    else if (fromExt === 'pdf' && toFmt === 'txt') {
      const text = extractTextFromPdf(bytes);
      outputBlob = new Blob([text], { type: 'text/plain' });
    }

    // ── Image → Image (JPG, PNG, WEBP) ──
    else if (
      ['jpg', 'jpeg', 'png', 'webp'].includes(fromExt) &&
      ['jpg', 'jpeg', 'png', 'webp'].includes(toFmt)
    ) {
      outputBlob = await convertImage(selectedFile, toFmt);
    }

    // ── Fallback: just rename/copy the file ──
    else {
      outputBlob = new Blob([bytes], { type: selectedFile.type });
    }

    showProgress(80, 'Applying size target…');

    // If user set a target size AND output is an image, compress it
    if (
      targetBytes &&
      outputBlob &&
      outputBlob.size > targetBytes &&
      ['jpg', 'jpeg', 'png', 'webp'].includes(toFmt)
    ) {
      outputBlob = await compressImageToTargetSize(outputBlob, toFmt, targetBytes);
    }

    showProgress(100, 'Done!');

    // Short pause so user sees 100%
    await new Promise(function(resolve) { setTimeout(resolve, 300); });

    hideProgress();
    showResult(outputName, outputBlob);

  } catch (error) {
    hideProgress();
    showError('Conversion failed: ' + error.message);
    console.error(error);
  }

  // Re-enable button
  btn.disabled = false;
  checkReady();
});

// ──────────────────────────────────────
//   CONVERSION FUNCTIONS
// ──────────────────────────────────────

// Convert image to another image format using canvas
function convertImage(file, toFormat) {
  return new Promise(function(resolve, reject) {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);

      const mimeType = toFormat === 'png'  ? 'image/png'
                     : toFormat === 'webp' ? 'image/webp'
                     :                       'image/jpeg';

      canvas.toBlob(function(blob) {
        URL.revokeObjectURL(url);
        resolve(blob);
      }, mimeType, 0.92);
    };

    img.onerror = function() {
      reject(new Error('Cannot read image file'));
    };

    img.src = url;
  });
}

// Compress an image blob until it fits inside targetBytes
function compressImageToTargetSize(blob, format, targetBytes) {
  return new Promise(function(resolve) {
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = function() {
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      let quality = 0.9;
      let width   = img.width;
      let height  = img.height;
      const canvas = document.createElement('canvas');

      function tryCompress() {
        canvas.width  = Math.round(width);
        canvas.height = Math.round(height);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(function(result) {
          // Stop if small enough, or quality is very low
          if (!result || result.size <= targetBytes || quality < 0.05) {
            resolve(result || blob);
            return;
          }
          // Reduce quality each attempt
          quality -= 0.12;
          // If quality bottoms out, also shrink dimensions
          if (quality < 0.1) {
            width   *= 0.8;
            height  *= 0.8;
            quality  = 0.7;
          }
          tryCompress();
        }, mimeType, quality);
      }

      tryCompress();
      URL.revokeObjectURL(url);
    };

    img.onerror = function() { resolve(blob); };
    img.src = url;
  });
}

// Extract text from a DOCX file (reads the XML inside)
function extractTextFromDocx(bytes) {
  try {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    const matches = text.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g);
    if (matches) {
      return matches
        .map(function(m) { return m.replace(/<[^>]+>/g, ''); })
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    return '[No readable text found]';
  } catch (e) {
    return '[Error reading file: ' + e.message + ']';
  }
}

// Extract text tokens from a PDF file
function extractTextFromPdf(bytes) {
  try {
    const raw = new TextDecoder('latin1').decode(bytes);
    const chunks = [];
    const blockPattern = /BT[\s\S]*?ET/g;
    let block;

    while ((block = blockPattern.exec(raw)) !== null) {
      const tjPattern  = /\(([^)]*)\)\s*T[jJ]/g;
      const arrPattern = /\[([^\]]+)\]\s*TJ/g;
      let match;

      while ((match = tjPattern.exec(block[0]))  !== null) chunks.push(match[1]);
      while ((match = arrPattern.exec(block[0])) !== null) {
        const parts = match[1].match(/\(([^)]*)\)/g);
        if (parts) parts.forEach(function(p) { chunks.push(p.slice(1, -1)); });
      }
    }

    return chunks
      .join(' ')
      .replace(/\\n/g, '\n')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .trim() || '[No readable text — PDF may be image-based]';

  } catch (e) {
    return '[Error: ' + e.message + ']';
  }
}

// Build a minimal DOCX file from plain text
function convertTxtToDocx(text) {
  // Escape XML special characters
  function escapeXml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Each line becomes a Word paragraph
  const paragraphs = text.split('\n').map(function(line) {
    return '<w:p><w:r><w:t xml:space="preserve">'
      + escapeXml(line)
      + '</w:t></w:r></w:p>';
  }).join('');

  const documentXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    + '<w:body>' + paragraphs + '</w:body></w:document>';

  const relsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" '
    + 'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
    + 'Target="word/document.xml"/></Relationships>';

  const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/word/document.xml" '
    + 'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    + '</Types>';

  // Build a minimal ZIP (no compression — store method)
  function strToBytes(str) { return new TextEncoder().encode(str); }
  function uint16(n) { return [n & 0xff, (n >> 8) & 0xff]; }
  function uint32(n) { return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]; }

  function crc32(data) {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[i] = c;
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function makeEntry(name, data) {
    const nameBytes = strToBytes(name);
    const crc       = crc32(data);
    const header    = new Uint8Array([
      0x50, 0x4B, 0x03, 0x04,   // Local file header signature
      0x14, 0x00,                // Version needed
      0x00, 0x00,                // General purpose bit flag
      0x00, 0x00,                // Compression: stored (0 = no compression)
      0x00, 0x00, 0x00, 0x00,   // Last mod time/date
      ...uint32(crc),            // CRC-32
      ...uint32(data.length),    // Compressed size
      ...uint32(data.length),    // Uncompressed size
      ...uint16(nameBytes.length),
      ...uint16(0)               // Extra field length
    ]);
    return { header, nameBytes, data, crc, size: data.length };
  }

  function buildZip(entries) {
    const localParts = [];
    let offset = 0;
    const centralDirs = [];

    for (const entry of entries) {
      const local = [...entry.header, ...entry.nameBytes, ...entry.data];
      localParts.push(new Uint8Array(local));

      centralDirs.push(new Uint8Array([
        0x50, 0x4B, 0x01, 0x02,     // Central dir signature
        0x14, 0x00, 0x14, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        ...uint32(entry.crc),
        ...uint32(entry.size),
        ...uint32(entry.size),
        ...uint16(entry.nameBytes.length),
        ...uint16(0), ...uint16(0),
        ...uint16(0), ...uint16(0),
        ...uint32(0),
        ...uint32(offset),
        ...entry.nameBytes
      ]));

      offset += local.length;
    }

    const centralStart = offset;
    const centralSize  = centralDirs.reduce(function(sum, d) { return sum + d.length; }, 0);

    const endOfCentral = new Uint8Array([
      0x50, 0x4B, 0x05, 0x06,     // End of central dir signature
      0x00, 0x00, 0x00, 0x00,
      ...uint16(entries.length),
      ...uint16(entries.length),
      ...uint32(centralSize),
      ...uint32(centralStart),
      ...uint16(0)
    ]);

    const allParts = [...localParts, ...centralDirs, endOfCentral];
    const total    = allParts.reduce(function(sum, p) { return sum + p.length; }, 0);
    const buffer   = new Uint8Array(total);
    let position   = 0;

    for (const part of allParts) {
      buffer.set(part, position);
      position += part.length;
    }

    return buffer;
  }

  const enc   = strToBytes;
  const zip   = buildZip([
    makeEntry('_rels/.rels',           enc(relsXml)),
    makeEntry('[Content_Types].xml',   enc(contentTypes)),
    makeEntry('word/document.xml',     enc(documentXml)),
  ]);

  return new Blob([zip], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
}