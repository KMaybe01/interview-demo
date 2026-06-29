let aesKey: CryptoKey | null = null;
let rsaKeyPair: CryptoKeyPair | null = null;

interface GenerateKeyMessage {
  type: 'generate-key';
}

interface InitMessage {
  type: 'init';
  key: ArrayBuffer;
}

interface DecryptMessage {
  type: 'decrypt';
  data: string;
  seq: number;
}

type WorkerInput = GenerateKeyMessage | InitMessage | DecryptMessage;

self.onmessage = async (e: MessageEvent<WorkerInput>) => {
  const msg = e.data;

  if (msg.type === 'generate-key') {
    rsaKeyPair = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt'],
    );
    const spki = await crypto.subtle.exportKey('spki', rsaKeyPair.publicKey);
    const b64 = btoa(String.fromCharCode(...new Uint8Array(spki)));
    self.postMessage({ type: 'key-generated', publicKey: b64 });
    return;
  }

  if (msg.type === 'init') {
    if (rsaKeyPair) {
      try {
        const rawKey = await crypto.subtle.decrypt(
          { name: 'RSA-OAEP' },
          rsaKeyPair.privateKey,
          msg.key,
        );
        const keyBuf = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', true, ['decrypt']);
        const exported = await crypto.subtle.exportKey('raw', keyBuf);
        self.postMessage(
          { type: 'aes-key-ready', key: exported } satisfies { type: string; key: ArrayBuffer },
          [exported],
        );
      } catch (err) {
        self.postMessage({ type: 'error', message: `RSA decrypt failed: ${String(err)}` });
      }
      return;
    }
    aesKey = await crypto.subtle.importKey('raw', msg.key, 'AES-GCM', false, ['decrypt']);
    return;
  }

  if (aesKey == null) return;

  const { data, seq } = msg;
  const raw = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  const nonce = raw.slice(0, 12);
  const ciphertext = raw.slice(12);
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: nonce },
      aesKey,
      ciphertext,
    );
    const lines = new TextDecoder('utf-8').decode(plaintext).split('\n').filter(Boolean);
    self.postMessage({ lines, seq });
  } catch {
    self.postMessage({ lines: [], seq });
  }
};
