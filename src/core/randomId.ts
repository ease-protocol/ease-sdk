export function randomUUID(): string {
  // 1) If Web Crypto exists (RN 0.73+/Hermes may have it), use it
  const c = globalThis.crypto as any;
  if (c?.randomUUID) return c.randomUUID();

  // 2) Otherwise, getRandomValues if available
  const getRandomValues: ((a: Uint8Array) => Uint8Array) | undefined = c?.getRandomValues;

  const bytes = new Uint8Array(16);
  if (getRandomValues) {
    getRandomValues(bytes);
  } else {
    // 3) Last resort (not crypto-secure, fine for correlation IDs)
    for (let i = 0; i < 16; i++) bytes[i] = (Math.random() * 256) | 0;
  }

  // RFC 4122 v4
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex: string[] = [];
  for (let i = 0; i < 256; i++) hex.push(i.toString(16).padStart(2, '0'));
  return (
    hex[bytes[0]] +
    hex[bytes[1]] +
    hex[bytes[2]] +
    hex[bytes[3]] +
    '-' +
    hex[bytes[4]] +
    hex[bytes[5]] +
    '-' +
    hex[bytes[6]] +
    hex[bytes[7]] +
    '-' +
    hex[bytes[8]] +
    hex[bytes[9]] +
    '-' +
    hex[bytes[10]] +
    hex[bytes[11]] +
    hex[bytes[12]] +
    hex[bytes[13]] +
    hex[bytes[14]] +
    hex[bytes[15]]
  );
}
