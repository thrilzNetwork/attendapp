import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';

/**
 * True if an IP literal belongs to a private, loopback, link-local, or otherwise
 * non-public range — the addresses an SSRF attacker would target to reach
 * internal services or cloud metadata endpoints.
 */
export function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);

  if (version === 4) {
    const o = ip.split('.').map(Number);
    if (o[0] === 0) return true;                         // 0.0.0.0/8
    if (o[0] === 10) return true;                        // private
    if (o[0] === 127) return true;                       // loopback
    if (o[0] === 169 && o[1] === 254) return true;       // link-local / cloud metadata (169.254.169.254)
    if (o[0] === 172 && o[1] >= 16 && o[1] <= 31) return true; // private
    if (o[0] === 192 && o[1] === 168) return true;       // private
    if (o[0] === 100 && o[1] >= 64 && o[1] <= 127) return true; // CGNAT
    return false;
  }

  if (version === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;   // loopback / unspecified
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
    if (lower.startsWith('fe80')) return true;            // link-local
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/); // IPv4-mapped
    if (mapped) return isPrivateIp(mapped[1]);
    return false;
  }

  return false;
}

/**
 * Validate a user-supplied URL before fetching it server-side.
 * Rejects non-http(s) schemes and any host that is — or resolves to — a
 * private/internal address. Throws on rejection; returns the parsed URL otherwise.
 */
export async function assertSafePublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Invalid URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https URLs are allowed');
  }

  const host = url.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    throw new Error('Blocked internal host');
  }

  // IP literal — check directly, no DNS needed.
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error('Blocked private address');
    return url;
  }

  // Hostname — resolve and ensure it doesn't point at an internal address.
  const resolved = await lookup(host, { all: true });
  if (resolved.length === 0 || resolved.some(r => isPrivateIp(r.address))) {
    throw new Error('Blocked private address');
  }

  return url;
}
