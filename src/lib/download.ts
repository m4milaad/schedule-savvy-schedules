/** Bridge the Android app injects (android/app/src/main/java/com/cukacadex/app/MainActivity.kt). */
interface AndroidDownloads {
  save(base64: string, filename: string, mimeType: string): void;
}

declare global {
  interface Window {
    AndroidDownloads?: AndroidDownloads;
  }
}

/** Saves a file. In the Android app's WebView `<a download>` does nothing, so the bytes go to the native side. */
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const bridge = window.AndroidDownloads;
  if (bridge) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    bridge.save(btoa(binary), filename, blob.type || 'application/octet-stream');
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
