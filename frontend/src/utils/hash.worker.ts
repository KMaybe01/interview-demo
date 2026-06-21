let buffers: ArrayBuffer[] = []

self.onmessage = async (e: MessageEvent<{ type: string; buffer?: ArrayBuffer }>) => {
  const msg = e.data
  if (msg.type === "file" && msg.buffer) {
    buffers.push(msg.buffer)
    return
  }
  if (msg.type === "finalize") {
    const totalSize = buffers.reduce((s, b) => s + b.byteLength, 0)
    const combined = new Uint8Array(totalSize)
    let offset = 0
    for (const buf of buffers) {
      combined.set(new Uint8Array(buf), offset)
      offset += buf.byteLength
    }
    buffers = []
    const hashBuf = await crypto.subtle.digest("SHA-256", combined.buffer)
    self.postMessage({
      type: "result",
      hash: Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
    })
  }
}
