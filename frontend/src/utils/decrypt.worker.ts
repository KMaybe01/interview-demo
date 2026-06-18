let aesKey: CryptoKey | null = null

interface InitMessage {
  type: "init"
  key: ArrayBuffer
}

interface DecryptMessage {
  type: "decrypt"
  data: string
  seq: number
}

type WorkerInput = InitMessage | DecryptMessage

self.onmessage = async (e: MessageEvent<WorkerInput>) => {
  const msg = e.data
  if (msg.type === "init") {
    aesKey = await crypto.subtle.importKey("raw", msg.key, "AES-GCM", false, ["decrypt"])
    return
  }
  if (aesKey == null) return

  const { data, seq } = msg
  const raw = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
  const nonce = raw.slice(0, 12)
  const ciphertext = raw.slice(12)
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: nonce },
      aesKey,
      ciphertext,
    )
    const lines = new TextDecoder("utf-8").decode(plaintext).split("\n").filter(Boolean)
    self.postMessage({ lines, seq })
  } catch {
    self.postMessage({ lines: [], seq })
  }
}
