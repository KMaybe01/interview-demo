let chunks: BlobPart[] = [];

self.onmessage = async (e: MessageEvent<{ type: string; buffer?: ArrayBuffer }>) => {
  const msg = e.data;
  if (msg.type === 'file' && msg.buffer) {
    chunks.push(msg.buffer);
    return;
  }
  if (msg.type === 'finalize') {
    const blob = new Blob(chunks, { type: 'application/octet-stream' });
    chunks = [];
    const hashBuf = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    self.postMessage({
      type: 'result',
      hash: Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(''),
    });
  }
};
