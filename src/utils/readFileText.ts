/**
 * Read a File as text, auto-detecting encoding from BOM.
 * Handles UTF-16LE, UTF-16BE, and UTF-8 (with or without BOM).
 */
export async function readFileText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);

  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE)
    return new TextDecoder('utf-16le').decode(buf);

  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF)
    return new TextDecoder('utf-16be').decode(buf);

  return new TextDecoder('utf-8').decode(buf);
}
