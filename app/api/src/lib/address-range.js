/**
 * SSRF address guard — the range table from hld.md section 8, as data plus a pure
 * predicate (S2, RK02, F01-AC13, EC09, F01-EC2).
 *
 * This module is deliberately PURE: it performs no DNS resolution, opens no socket,
 * and imports nothing from node:dns, node:net or node:https. That is what lets the
 * whole table be exhaustively tested without any I/O (lld.md section 11), and it is
 * asserted by a test.
 *
 * It FAILS CLOSED: anything this module cannot parse with confidence is reported as
 * blocked. An address the guard does not understand is not an address it should
 * connect to.
 */

/** The literal hostname is refused outright, independently of what it resolves to. */
const BLOCKED_HOSTNAMES = Object.freeze(['localhost']);

/** IPv4, from hld.md section 8: 0/8, 10/8, 100.64/10, 127/8, 169.254/16, 172.16/12, 192.168/16, 224/4, 240/4. */
export const IPV4_BLOCKED_RANGES = Object.freeze([
  { cidr: '0.0.0.0/8', base: '0.0.0.0', bits: 8, reason: 'this-network' },
  { cidr: '10.0.0.0/8', base: '10.0.0.0', bits: 8, reason: 'private' },
  { cidr: '100.64.0.0/10', base: '100.64.0.0', bits: 10, reason: 'carrier-grade-nat' },
  { cidr: '127.0.0.0/8', base: '127.0.0.0', bits: 8, reason: 'loopback' },
  { cidr: '169.254.0.0/16', base: '169.254.0.0', bits: 16, reason: 'link-local' },
  { cidr: '172.16.0.0/12', base: '172.16.0.0', bits: 12, reason: 'private' },
  { cidr: '192.168.0.0/16', base: '192.168.0.0', bits: 16, reason: 'private' },
  { cidr: '224.0.0.0/4', base: '224.0.0.0', bits: 4, reason: 'multicast' },
  { cidr: '240.0.0.0/4', base: '240.0.0.0', bits: 4, reason: 'reserved' },
]);

/** IPv6, from hld.md section 8: ::1, ::, fc00::/7, fe80::/10. */
export const IPV6_BLOCKED_RANGES = Object.freeze([
  { cidr: '::1/128', base: '::1', bits: 128, reason: 'loopback' },
  { cidr: '::/128', base: '::', bits: 128, reason: 'unspecified' },
  { cidr: 'fc00::/7', base: 'fc00::', bits: 7, reason: 'unique-local' },
  { cidr: 'fe80::/10', base: 'fe80::', bits: 10, reason: 'link-local' },
]);

/**
 * @param {string} text
 * @returns {number[] | null} four octets, or null if this is not a plain dotted quad
 */
function parseIpv4(text) {
  const parts = text.split('.');
  if (parts.length !== 4) return null;
  const octets = [];
  for (const part of parts) {
    // Reject empty, non-digit, and leading-zero forms: this function parses a
    // RESOLVED address, which is always canonical. Anything else fails closed.
    if (!/^(0|[1-9][0-9]{0,2})$/.test(part)) return null;
    const value = Number(part);
    if (value > 255) return null;
    octets.push(value);
  }
  return octets;
}

/**
 * @param {string} text
 * @returns {number[] | null} eight 16-bit groups, or null if unparseable
 */
function parseIpv6(text) {
  let input = text.trim();
  // A resolved address is never bracketed, but accept it so a caller passing a URL
  // hostname cannot accidentally bypass the guard by shape alone.
  if (input.startsWith('[') && input.endsWith(']')) {
    input = input.slice(1, -1);
  }
  // Drop a zone index (fe80::1%eth0).
  const zoneAt = input.indexOf('%');
  if (zoneAt !== -1) input = input.slice(0, zoneAt);
  if (input === '') return null;

  // A trailing dotted quad (::ffff:127.0.0.1) becomes two 16-bit groups.
  let tail = [];
  const lastColon = input.lastIndexOf(':');
  const afterLastColon = lastColon === -1 ? '' : input.slice(lastColon + 1);
  if (afterLastColon.includes('.')) {
    const quad = parseIpv4(afterLastColon);
    if (!quad) return null;
    tail = [(quad[0] << 8) | quad[1], (quad[2] << 8) | quad[3]];
    input = input.slice(0, lastColon + 1) + '0';
  }

  const doubleColonCount = input.split('::').length - 1;
  if (doubleColonCount > 1) return null;

  let headText;
  let tailText;
  if (doubleColonCount === 1) {
    const [left, right] = input.split('::');
    headText = left === '' ? [] : left.split(':');
    tailText = right === '' ? [] : right.split(':');
  } else {
    headText = input.split(':');
    tailText = [];
  }

  const toGroups = (items) => {
    const groups = [];
    for (const item of items) {
      if (!/^[0-9a-fA-F]{1,4}$/.test(item)) return null;
      groups.push(parseInt(item, 16));
    }
    return groups;
  };

  const head = toGroups(headText);
  const rest = toGroups(tailText);
  if (head === null || rest === null) return null;

  // The placeholder '0' added for a dotted quad is replaced by the two real groups.
  const restWithTail = tail.length > 0 ? rest.slice(0, -1).concat(tail) : rest;

  if (doubleColonCount === 0) {
    return head.length === 8 ? head : null;
  }

  const fillCount = 8 - head.length - restWithTail.length;
  if (fillCount < 0) return null;
  return head.concat(Array(fillCount).fill(0), restWithTail);
}

function ipv4ToBytes(octets) {
  return octets;
}

function ipv6ToBytes(groups) {
  const bytes = [];
  for (const group of groups) {
    bytes.push((group >> 8) & 0xff, group & 0xff);
  }
  return bytes;
}

/** @returns {boolean} true when `bytes` falls inside `baseBytes`/`bits` */
function inPrefix(bytes, baseBytes, bits) {
  let remaining = bits;
  for (let i = 0; i < bytes.length; i += 1) {
    if (remaining <= 0) return true;
    const take = Math.min(8, remaining);
    const mask = take === 8 ? 0xff : (0xff << (8 - take)) & 0xff;
    if ((bytes[i] & mask) !== (baseBytes[i] & mask)) return false;
    remaining -= take;
  }
  return true;
}

/** IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible forms carry an embedded IPv4. */
function embeddedIpv4(groups) {
  const firstFiveAreZero = groups.slice(0, 5).every((g) => g === 0);
  if (!firstFiveAreZero) return null;
  if (groups[5] !== 0xffff && groups[5] !== 0x0000) return null;
  // ::0:0 and ::1 are handled by the IPv6 table itself, not as embedded IPv4.
  if (groups[5] === 0x0000 && (groups[6] & 0xffff) === 0 && groups[7] <= 1) return null;
  return [(groups[6] >> 8) & 0xff, groups[6] & 0xff, (groups[7] >> 8) & 0xff, groups[7] & 0xff];
}

function ipv4Reason(octets) {
  const bytes = ipv4ToBytes(octets);
  for (const range of IPV4_BLOCKED_RANGES) {
    if (inPrefix(bytes, ipv4ToBytes(parseIpv4(range.base)), range.bits)) {
      return range.reason;
    }
  }
  return null;
}

/**
 * Why this address is refused, or null when it is allowed. Exported so a caller can
 * log a specific reason to the server console (never to the client, U5).
 *
 * @param {string} ip a RESOLVED address, or the literal hostname 'localhost'
 * @param {4 | 6} [family] optional hint; the shape of `ip` is authoritative
 * @returns {string | null}
 */
export function blockedReason(ip, family) {
  if (typeof ip !== 'string' || ip.trim() === '') return 'unparseable';

  const value = ip.trim().toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(value)) return 'loopback-hostname';

  const looksV6 = value.includes(':');
  if (!looksV6 && family !== 6) {
    const octets = parseIpv4(value);
    if (!octets) return 'unparseable';
    return ipv4Reason(octets);
  }

  const groups = parseIpv6(value);
  if (!groups) return 'unparseable';

  const embedded = embeddedIpv4(groups);
  if (embedded) {
    const reason = ipv4Reason(embedded);
    return reason === null ? null : `ipv4-mapped-${reason}`;
  }

  const bytes = ipv6ToBytes(groups);
  for (const range of IPV6_BLOCKED_RANGES) {
    const baseGroups = parseIpv6(range.base);
    if (baseGroups && inPrefix(bytes, ipv6ToBytes(baseGroups), range.bits)) {
      return range.reason;
    }
  }

  return null;
}

/**
 * The predicate F01-AC13 turns on. True means: do not open a socket to this address.
 *
 * @param {string} ip a RESOLVED address
 * @param {4 | 6} [family]
 * @returns {boolean}
 */
export function isBlockedAddress(ip, family) {
  return blockedReason(ip, family) !== null;
}
