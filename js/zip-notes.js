/**
 * Build a ZIP (STORE method, no compression) with multiple .md files — browser APIs only.
 * Filenames are ASCII (YYYY-MM-DD.md).
 */

/** @returns {Uint32Array} */
function makeCrcTable() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c >>> 0;
  }
  return t;
}

const CRC_TABLE = makeCrcTable();

/** @param {Uint8Array} buf */
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * @param {{ name: string; content: string }[]} files
 * @returns {Uint8Array}
 */
function buildZipStore(files) {
  const enc = new TextEncoder();
  const chunks = [];
  let offset = 0;
  const centralParts = [];

  for (const { name, content } of files) {
    const nameBytes = enc.encode(name);
    const data = enc.encode(content);
    const crc = crc32(data);
    const localNameLen = nameBytes.length;
    const localHeaderSize = 30 + localNameLen;
    const lh = new Uint8Array(localHeaderSize);
    const v = new DataView(lh.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 0, true);
    v.setUint16(8, 0, true);
    v.setUint16(10, 0, true);
    v.setUint16(12, 0, true);
    v.setUint32(14, crc, true);
    v.setUint32(18, data.length, true);
    v.setUint32(22, data.length, true);
    v.setUint16(26, localNameLen, true);
    v.setUint16(28, 0, true);
    lh.set(nameBytes, 30);
    chunks.push(lh, data);

    const cd = new Uint8Array(46 + localNameLen);
    const cdv = new DataView(cd.buffer);
    cdv.setUint32(0, 0x02014b50, true);
    cdv.setUint16(4, 20, true);
    cdv.setUint16(6, 20, true);
    cdv.setUint16(8, 0, true);
    cdv.setUint16(10, 0, true);
    cdv.setUint16(12, 0, true);
    cdv.setUint16(14, 0, true);
    cdv.setUint32(16, crc, true);
    cdv.setUint32(20, data.length, true);
    cdv.setUint32(24, data.length, true);
    cdv.setUint16(28, localNameLen, true);
    cdv.setUint16(30, 0, true);
    cdv.setUint16(32, 0, true);
    cdv.setUint16(34, 0, true);
    cdv.setUint32(38, 0, true);
    cdv.setUint32(42, offset, true);
    cd.set(nameBytes, 46);
    centralParts.push(cd);

    offset += localHeaderSize + data.length;
  }

  const centralBlob = centralParts.reduce((acc, p) => {
    const n = new Uint8Array(acc.length + p.length);
    n.set(acc, 0);
    n.set(p, acc.length);
    return n;
  }, new Uint8Array(0));

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralBlob.length, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const body = chunks.reduce((acc, p) => {
    const n = new Uint8Array(acc.length + p.length);
    n.set(acc, 0);
    n.set(p, acc.length);
    return n;
  }, new Uint8Array(0));

  const out = new Uint8Array(body.length + centralBlob.length + eocd.length);
  out.set(body, 0);
  out.set(centralBlob, body.length);
  out.set(eocd, body.length + centralBlob.length);
  return out;
}

/**
 * @param {Record<string, string>} notes
 * @param {string} [zipBasename] without .zip extension
 */
export function downloadNotesAsZip(notes, zipBasename = "daily-markdown-notes") {
  const entries = Object.keys(notes)
    .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))
    .filter((k) => String(notes[k] ?? "").trim() !== "")
    .sort()
    .map((k) => ({ name: `${k}.md`, content: String(notes[k] ?? "") }));

  if (entries.length === 0) {
    return false;
  }

  const zipBytes = buildZipStore(entries);
  const blob = new Blob([zipBytes], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${zipBasename}.zip`;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}
