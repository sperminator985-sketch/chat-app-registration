type Box = { type: string; start: number; size: number; header: number };

const readBoxes = async (file: Blob): Promise<Box[] | null> => {
  const boxes: Box[] = [];
  let pos = 0;
  while (pos + 8 <= file.size) {
    const head = new DataView(await file.slice(pos, pos + 16).arrayBuffer());
    let size = head.getUint32(0);
    const type = String.fromCharCode(head.getUint8(4), head.getUint8(5), head.getUint8(6), head.getUint8(7));
    let header = 8;
    if (size === 1) {
      if (head.byteLength < 16) return null;
      size = Number(head.getBigUint64(8));
      header = 16;
    } else if (size === 0) {
      size = file.size - pos;
    }
    if (size < header || pos + size > file.size) return null;
    boxes.push({ type, start: pos, size, header });
    pos += size;
  }
  return boxes;
};

const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl']);

const patchOffsets = (view: DataView, from: number, to: number, shift: (o: number) => number): boolean => {
  let pos = from;
  while (pos + 8 <= to) {
    let size = view.getUint32(pos);
    const type = String.fromCharCode(
      view.getUint8(pos + 4),
      view.getUint8(pos + 5),
      view.getUint8(pos + 6),
      view.getUint8(pos + 7),
    );
    let header = 8;
    if (size === 1) {
      size = Number(view.getBigUint64(pos + 8));
      header = 16;
    } else if (size === 0) {
      size = to - pos;
    }
    if (size < header || pos + size > to) return false;
    if (type === 'cmov') return false;
    if (CONTAINERS.has(type)) {
      if (!patchOffsets(view, pos + header, pos + size, shift)) return false;
    } else if (type === 'stco') {
      const count = view.getUint32(pos + header + 4);
      for (let i = 0; i < count; i++) {
        const at = pos + header + 8 + i * 4;
        const next = shift(view.getUint32(at));
        if (next > 0xffffffff) return false;
        view.setUint32(at, next);
      }
    } else if (type === 'co64') {
      const count = view.getUint32(pos + header + 4);
      for (let i = 0; i < count; i++) {
        const at = pos + header + 8 + i * 8;
        view.setBigUint64(at, BigInt(shift(Number(view.getBigUint64(at)))));
      }
    }
    pos += size;
  }
  return true;
};

export const makeFastStart = async (file: File): Promise<File> => {
  if (!/\.(mp4|m4v|mov|m4a)$/i.test(file.name)) return file;
  try {
    const boxes = await readBoxes(file);
    if (!boxes) return file;
    const moov = boxes.find((b) => b.type === 'moov');
    const firstMdat = boxes.find((b) => b.type === 'mdat');
    if (!moov || !firstMdat || moov.start < firstMdat.start) return file;

    const insertAt = firstMdat.start;
    const buf = await file.slice(moov.start, moov.start + moov.size).arrayBuffer();
    const view = new DataView(buf);
    const shift = (o: number) => (o >= insertAt && o < moov.start ? o + moov.size : o);
    if (!patchOffsets(view, moov.header, moov.size, shift)) return file;

    const parts: BlobPart[] = [file.slice(0, insertAt), buf, file.slice(insertAt, moov.start)];
    if (moov.start + moov.size < file.size) parts.push(file.slice(moov.start + moov.size));
    return new File(parts, file.name, { type: file.type, lastModified: file.lastModified });
  } catch {
    return file;
  }
};
