import { describe, expect, it } from 'vitest';
import { assertSafePublicUrl, isPrivateIp } from './ssrf';

describe('isPrivateIp', () => {
  it('flags private and reserved IPv4 ranges', () => {
    for (const ip of ['10.0.0.1', '127.0.0.1', '169.254.169.254', '172.16.5.4', '192.168.1.1', '100.64.0.1', '0.0.0.0']) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
  });

  it('allows public IPv4 addresses', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '93.184.216.34']) {
      expect(isPrivateIp(ip), ip).toBe(false);
    }
  });

  it('flags loopback, ULA, link-local and IPv4-mapped IPv6', () => {
    for (const ip of ['::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
  });
});

describe('assertSafePublicUrl', () => {
  it('rejects non-http(s) schemes', async () => {
    for (const u of ['file:///etc/passwd', 'ftp://example.com', 'gopher://x']) {
      await expect(assertSafePublicUrl(u)).rejects.toThrow();
    }
  });

  it('rejects localhost and internal hostnames', async () => {
    for (const u of ['http://localhost/x', 'http://db.internal/x', 'http://printer.local']) {
      await expect(assertSafePublicUrl(u)).rejects.toThrow();
    }
  });

  it('rejects private IP literals (incl. cloud metadata)', async () => {
    for (const u of ['http://127.0.0.1/', 'http://169.254.169.254/latest/meta-data', 'http://10.1.2.3/', 'http://[::1]/']) {
      await expect(assertSafePublicUrl(u)).rejects.toThrow();
    }
  });

  it('allows a public IP literal', async () => {
    const url = await assertSafePublicUrl('https://8.8.8.8/');
    expect(url.hostname).toBe('8.8.8.8');
  });

  it('rejects a malformed URL', async () => {
    await expect(assertSafePublicUrl('not a url')).rejects.toThrow();
  });
});
