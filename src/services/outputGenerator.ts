/**
 * Generate a downloadable text file with UTF-8 BOM encoding.
 */
export function generateOutputBlob(content: string, withBOM = true): Blob {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(content);

  if (withBOM) {
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const combined = new Uint8Array(bom.length + encoded.length);
    combined.set(bom, 0);
    combined.set(encoded, bom.length);
    return new Blob([combined], { type: 'text/plain;charset=utf-8' });
  }

  return new Blob([encoded], { type: 'text/plain;charset=utf-8' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
