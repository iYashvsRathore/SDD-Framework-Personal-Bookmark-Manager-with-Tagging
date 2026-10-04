import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  IPV4_BLOCKED_RANGES,
  IPV6_BLOCKED_RANGES,
  blockedReason,
  isBlockedAddress,
} from '../src/lib/address-range.js';

/**
 * Every IPv4 range from hld.md section 8, with its FIRST and LAST address, plus the
 * address immediately below and immediately above the range. Boundaries are where
 * off-by-one guard bugs live (RK02), so both sides are asserted.
 */
const IPV4_BOUNDARIES = [
  { cidr: '0.0.0.0/8', first: '0.0.0.0', last: '0.255.255.255', justAbove: '1.0.0.0' },
  {
    cidr: '10.0.0.0/8',
    first: '10.0.0.0',
    last: '10.255.255.255',
    justBelow: '9.255.255.255',
    justAbove: '11.0.0.0',
  },
  {
    cidr: '100.64.0.0/10',
    first: '100.64.0.0',
    last: '100.127.255.255',
    justBelow: '100.63.255.255',
    justAbove: '100.128.0.0',
  },
  {
    cidr: '127.0.0.0/8',
    first: '127.0.0.0',
    last: '127.255.255.255',
    justBelow: '126.255.255.255',
    justAbove: '128.0.0.0',
  },
  {
    cidr: '169.254.0.0/16',
    first: '169.254.0.0',
    last: '169.254.255.255',
    justBelow: '169.253.255.255',
    justAbove: '169.255.0.0',
  },
  {
    cidr: '172.16.0.0/12',
    first: '172.16.0.0',
    last: '172.31.255.255',
    justBelow: '172.15.255.255',
    justAbove: '172.32.0.0',
  },
  {
    cidr: '192.168.0.0/16',
    first: '192.168.0.0',
    last: '192.168.255.255',
    justBelow: '192.167.255.255',
    justAbove: '192.169.0.0',
  },
  {
    cidr: '224.0.0.0/4',
    first: '224.0.0.0',
    last: '239.255.255.255',
    justBelow: '223.255.255.255',
  },
  {
    cidr: '240.0.0.0/4',
    first: '240.0.0.0',
    last: '255.255.255.255',
    justBelow: '239.255.255.255',
  },
];

describe('isBlockedAddress — IPv4 ranges from hld.md section 8', () => {
  it('covers every declared range in this test file', () => {
    expect(IPV4_BOUNDARIES.map((r) => r.cidr).sort()).toEqual(
      IPV4_BLOCKED_RANGES.map((r) => r.cidr).sort()
    );
  });

  it.each(IPV4_BOUNDARIES)('$cidr blocks its first address $first', ({ first }) => {
    expect(isBlockedAddress(first, 4)).toBe(true);
  });

  it.each(IPV4_BOUNDARIES)('$cidr blocks its last address $last', ({ last }) => {
    expect(isBlockedAddress(last, 4)).toBe(true);
  });

  it.each(IPV4_BOUNDARIES.filter((r) => r.justBelow))(
    '$cidr does not over-reach below, at $justBelow',
    ({ justBelow }) => {
      // 239.255.255.255 sits just below 240/4 but inside 224/4, so it stays blocked.
      const expected = justBelow === '239.255.255.255' ? true : false;
      expect(isBlockedAddress(justBelow, 4)).toBe(expected);
    }
  );

  it.each(IPV4_BOUNDARIES.filter((r) => r.justAbove))(
    '$cidr does not over-reach above, at $justAbove',
    ({ justAbove }) => {
      expect(isBlockedAddress(justAbove, 4)).toBe(false);
    }
  );

  it.each([
    ['127.0.0.1', 'loopback'],
    ['10.0.0.1', 'private'],
    ['192.168.1.1', 'private'],
    ['169.254.169.254', 'link-local'],
    ['172.16.0.1', 'private'],
    ['0.0.0.0', 'this-network'],
    ['255.255.255.255', 'reserved'],
  ])('%s is blocked with reason %s', (ip, reason) => {
    expect(blockedReason(ip, 4)).toBe(reason);
  });
});

describe('isBlockedAddress — public addresses are allowed', () => {
  it.each([['8.8.8.8'], ['1.1.1.1'], ['93.184.216.34'], ['203.0.113.10'], ['198.51.100.7']])(
    'allows %s',
    (ip) => {
      expect(isBlockedAddress(ip, 4)).toBe(false);
      expect(blockedReason(ip, 4)).toBeNull();
    }
  );
});

describe('isBlockedAddress — IPv6 ranges from hld.md section 8', () => {
  it('covers every declared range in this test file', () => {
    expect(IPV6_BLOCKED_RANGES.map((r) => r.cidr).sort()).toEqual(
      ['::/128', '::1/128', 'fc00::/7', 'fe80::/10'].sort()
    );
  });

  it.each([
    ['::1', 'loopback'],
    ['::', 'unspecified'],
    ['fc00::', 'unique-local'],
    ['fc00::1', 'unique-local'],
    ['fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff', 'unique-local'],
    ['fe80::', 'link-local'],
    ['fe80::1', 'link-local'],
    ['febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff', 'link-local'],
  ])('%s is blocked with reason %s', (ip, reason) => {
    expect(blockedReason(ip, 6)).toBe(reason);
  });

  it.each([['2001:4860:4860::8888'], ['2606:4700:4700::1111'], ['fec0::1'], ['fb00::1']])(
    'allows the public address %s',
    (ip) => {
      expect(isBlockedAddress(ip, 6)).toBe(false);
    }
  );

  it('accepts a bracketed form without letting it slip past', () => {
    expect(isBlockedAddress('[::1]', 6)).toBe(true);
  });

  it('ignores a zone index rather than failing open', () => {
    expect(isBlockedAddress('fe80::1%eth0', 6)).toBe(true);
  });
});

describe('isBlockedAddress — IPv4-mapped IPv6 forms (F01-EC2, F01-AC13)', () => {
  it.each([
    ['::ffff:127.0.0.1'],
    ['::ffff:7f00:1'],
    ['::ffff:10.0.0.1'],
    ['::ffff:192.168.1.1'],
    ['::ffff:169.254.169.254'],
  ])('blocks %s', (ip) => {
    expect(isBlockedAddress(ip, 6)).toBe(true);
    expect(blockedReason(ip, 6)).toMatch(/^ipv4-mapped-/);
  });

  it('still allows a mapped PUBLIC address', () => {
    expect(isBlockedAddress('::ffff:8.8.8.8', 6)).toBe(false);
  });

  it('treats the two spellings of one mapped address identically', () => {
    expect(blockedReason('::ffff:127.0.0.1', 6)).toBe(blockedReason('::ffff:7f00:1', 6));
  });
});

describe('isBlockedAddress — the literal hostname', () => {
  it.each([['localhost'], ['LOCALHOST'], ['  localhost  ']])('blocks %s', (value) => {
    expect(isBlockedAddress(value)).toBe(true);
  });
});

describe('isBlockedAddress — fails CLOSED', () => {
  it.each([
    ['', 'empty'],
    ['   ', 'whitespace'],
    ['not-an-address', 'text'],
    ['999.1.1.1', 'octet out of range'],
    ['1.2.3', 'too few octets'],
    ['1.2.3.4.5', 'too many octets'],
    ['::1::2', 'two double colons'],
    ['gggg::1', 'non-hex group'],
  ])('blocks %s (%s) rather than allowing it', (value) => {
    expect(isBlockedAddress(value)).toBe(true);
  });

  it.each([[null], [undefined], [42], [{}], [[]]])('blocks the non-string %s', (value) => {
    expect(isBlockedAddress(value)).toBe(true);
  });
});

/**
 * lld.md section 11 makes purity a design obligation, not a convention: the whole
 * table is testable without I/O only because this module cannot perform any.
 */
describe('purity (lld.md section 11)', () => {
  it('imports nothing from node:dns, node:net, node:http or node:https', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const source = fs.readFileSync(path.resolve(here, '../src/lib/address-range.js'), 'utf8');
    expect(source).not.toMatch(/from\s+['"]node:(dns|net|https?|tls)['"]/);
    expect(source).not.toMatch(/require\(\s*['"]node:(dns|net|https?|tls)['"]/);
  });
});
