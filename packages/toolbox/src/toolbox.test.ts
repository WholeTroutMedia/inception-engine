/**
 * @inception/toolbox — Vitest Test Suite
 * Wave 31 Helix B
 * Covers: dev, design, web, security categories + ALL_TOOLBOX_TOOLS registry
 */
import { describe, it, expect } from 'vitest';

import {
  generateUUID,
  hashFNV32,
  regexTest,
  jwtDecode,
} from './categories/dev.js';

import {
  colorHexToHsl,
  contrastRatio,
  paletteGenerator,
  gradientString,
} from './categories/design.js';

import {
  urlParse,
  base64Encode,
  base64Decode,
  urlSlugify,
} from './categories/web.js';

import {
  passwordStrength,
  generateSecret,
  sanitizeHtml,
} from './categories/security.js';

import { ALL_TOOLBOX_TOOLS } from './mcp-tools.js';

// ── Dev Utils ─────────────────────────────────────────────────────────────────

describe('generateUUID', () => {
  it('returns a string', () => {
    expect(typeof generateUUID()).toBe('string');
  });

  it('matches RFC 4122 v4 pattern', () => {
    const uuid = generateUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('generates unique values', () => {
    const uuids = new Set(Array.from({ length: 100 }, () => generateUUID()));
    expect(uuids.size).toBe(100);
  });
});

describe('hashFNV32', () => {
  it('returns a number', () => {
    expect(typeof hashFNV32('hello')).toBe('number');
  });

  it('is deterministic', () => {
    expect(hashFNV32('inception')).toBe(hashFNV32('inception'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashFNV32('foo')).not.toBe(hashFNV32('bar'));
  });

  it('handles empty string', () => {
    expect(typeof hashFNV32('')).toBe('number');
  });
});

describe('regexTest', () => {
  it('matches a simple pattern', () => {
    const result = regexTest('\\d+', 'abc 123 def 456');
    expect(result.isValid).toBe(true);
    expect(result.matches).toEqual(['123', '456']);
    expect(result.matchCount).toBe(2);
  });

  it('returns empty matches when no match found', () => {
    const result = regexTest('\\d+', 'no numbers here');
    expect(result.isValid).toBe(true);
    expect(result.matches).toHaveLength(0);
    expect(result.matchCount).toBe(0);
  });

  it('handles invalid pattern gracefully', () => {
    const result = regexTest('[invalid', 'test');
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('captures named groups', () => {
    const result = regexTest('(?<year>\\d{4})-(?<month>\\d{2})', '2026-03', 'g');
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]!.year).toBe('2026');
    expect(result.groups[0]!.month).toBe('03');
  });
});

describe('jwtDecode', () => {
  // Build a valid JWT using Node Buffer (no btoa in older Node)
  const toB64Url = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');

  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  const header = toB64Url({ alg: 'HS256', typ: 'JWT' });
  const payload = toB64Url({ sub: '1234', exp: futureExp });
  const token = `${header}.${payload}.fakesignature`;

  it('decodes a valid JWT', () => {
    const result = jwtDecode(token);
    expect(result).not.toBeNull();
    expect(result!.header).toHaveProperty('alg', 'HS256');
    expect(result!.payload).toHaveProperty('sub', '1234');
  });

  it('returns signature field', () => {
    const result = jwtDecode(token);
    expect(result!.signature).toBe('fakesignature');
  });

  it('returns null for invalid token', () => {
    expect(jwtDecode('not.a.valid.jwt.token')).toBeNull();
  });

  it('detects non-expired token', () => {
    const result = jwtDecode(token);
    expect(result!.isExpired).toBe(false);
  });

  it('detects expired token', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 1000;
    const expiredPayload = toB64Url({ sub: 'expired', exp: pastExp });
    const expiredToken = `${header}.${expiredPayload}.sig`;
    const result = jwtDecode(expiredToken);
    expect(result!.isExpired).toBe(true);
  });
});

// ── Design Utils ─────────────────────────────────────────────────────────────

describe('colorHexToHsl', () => {
  it('converts pure red correctly', () => {
    const result = colorHexToHsl('#FF0000');
    expect(result).toHaveProperty('h', 0);
    expect(result).toHaveProperty('s', 100);
    expect(result).toHaveProperty('l', 50);
  });

  it('converts white', () => {
    const result = colorHexToHsl('#FFFFFF');
    expect(result.l).toBe(100);
  });

  it('converts black', () => {
    const result = colorHexToHsl('#000000');
    expect(result.l).toBe(0);
  });
});

describe('contrastRatio', () => {
  it('black vs white has max contrast', () => {
    const result = contrastRatio('#000000', '#FFFFFF');
    expect(result.ratio).toBeCloseTo(21, 0);
  });

  it('same color has ratio of 1', () => {
    const result = contrastRatio('#FF5733', '#FF5733');
    expect(result.ratio).toBeCloseTo(1, 1);
  });

  it('returns WCAG AA and AAA compliance flags', () => {
    const result = contrastRatio('#000000', '#FFFFFF');
    expect(result).toHaveProperty('wcagAA', true);
    expect(result).toHaveProperty('wcagAAA', true);
  });

  it('low contrast fails WCAG AA', () => {
    const result = contrastRatio('#AAAAAA', '#BBBBBB');
    expect(result.wcagAA).toBe(false);
  });
});

describe('paletteGenerator', () => {
  it('returns an object from a hex', () => {
    const result = paletteGenerator('#3B82F6');
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });
});

describe('gradientString', () => {
  it('generates a linear gradient string', () => {
    const result = gradientString({
      type: 'linear',
      direction: '135deg',
      stops: [{ color: '#FF5733' }, { color: '#3B82F6' }],
    });
    expect(typeof result).toBe('string');
    expect(result).toContain('linear-gradient');
    expect(result).toContain('#FF5733');
    expect(result).toContain('#3B82F6');
  });

  it('generates a radial gradient string', () => {
    const result = gradientString({
      type: 'radial',
      stops: [{ color: '#000000' }, { color: '#FFFFFF' }],
    });
    expect(result).toContain('radial-gradient');
  });
});

// ── Web Utils ─────────────────────────────────────────────────────────────────

describe('urlParse', () => {
  it('parses a full URL into components', () => {
    const result = urlParse('https://inception.io/api/v1?key=abc&env=prod');
    expect(result.valid).toBe(true);
    expect(result.protocol).toBe('https:');
    expect(result.host).toBe('inception.io');
    expect(result.pathname).toBe('/api/v1');
    expect(result.params).toEqual({ key: 'abc', env: 'prod' });
  });

  it('returns valid=false for invalid URL', () => {
    const result = urlParse('not a url');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('base64Encode / base64Decode', () => {
  it('encodes to a base64 result object', () => {
    const result = base64Encode('Hello, Creative Liberation Engine!');
    expect(result).toHaveProperty('output');
    expect(result).toHaveProperty('byteLength');
    expect(result.isUrlSafe).toBe(false);
  });

  it('round-trips a string', () => {
    const original = 'Hello, Creative Liberation Engine!';
    const encoded = base64Encode(original);
    const decoded = base64Decode(encoded.output);
    expect(decoded.valid).toBe(true);
    expect(decoded.output).toBe(original);
  });

  it('URL-safe mode output does not contain + or /', () => {
    const encoded = base64Encode('test data with spaces & symbols!', true);
    expect(encoded.isUrlSafe).toBe(true);
    expect(encoded.output).not.toMatch(/[+/=]/);
  });

  it('decode returns valid=false for garbage input', () => {
    const result = base64Decode('!!!not-base64!!!');
    expect(result.valid).toBe(false);
  });
});

describe('urlSlugify', () => {
  it('converts a title to a slug (returns string)', () => {
    const slug = urlSlugify('Hello World! This is Creative Liberation Engine');
    expect(typeof slug).toBe('string');
    expect(slug).toBe('hello-world-this-is-creative-liberation-engine');
  });

  it('respects custom separator', () => {
    const slug = urlSlugify('hello world', { separator: '_' });
    expect(slug).toBe('hello_world');
  });

  it('trims leading/trailing separators', () => {
    const slug = urlSlugify('  --inception--  ');
    expect(slug).not.toMatch(/^-|-$/);
  });
});

// ── Security Utils ────────────────────────────────────────────────────────────

describe('passwordStrength', () => {
  it('scores a weak password (all same digit) low', () => {
    const result = passwordStrength('111111');
    expect(result).toHaveProperty('score');
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('scores a very strong password high', () => {
    const result = passwordStrength('G3n3sis!@#Xq7$Zy&Wk');
    expect(result.score).toBeGreaterThanOrEqual(3);
  });

  it('returns feedback array', () => {
    const result = passwordStrength('password');
    expect(Array.isArray(result.feedback)).toBe(true);
  });

  it('includes label and entropy', () => {
    const result = passwordStrength('Hello_World_99!');
    expect(result).toHaveProperty('label');
    expect(result).toHaveProperty('entropy');
    expect(typeof result.entropy).toBe('number');
  });
});

describe('generateSecret', () => {
  it('generates a secret with correct structure', () => {
    const result = generateSecret(32, 'hex');
    expect(result).toHaveProperty('secret');
    expect(result).toHaveProperty('bits');
    expect(result).toHaveProperty('hex');
    expect(result).toHaveProperty('base64');
  });

  it('generates a hex-only secret', () => {
    const result = generateSecret(16, 'hex');
    expect(result.secret).toMatch(/^[0-9a-f]+$/);
  });

  it('generates alphanumeric secrets', () => {
    const result = generateSecret(24, 'alphanumeric');
    expect(result.secret).toMatch(/^[A-Za-z0-9]+$/);
    expect(result.secret.length).toBe(24);
  });
});

describe('sanitizeHtml', () => {
  it('strips script tags and their content', () => {
    const result = sanitizeHtml('<p>Hello</p><script>alert("xss")</script>');
    expect(result.output).not.toContain('<script>');
    expect(result.output).not.toContain('alert');
    expect(result.output).toContain('<p>Hello</p>');
  });

  it('removedTags contains stripped tag names', () => {
    const result = sanitizeHtml('<div><script>bad()</script></div>');
    expect(result.removedTags).toContain('script');
  });

  it('preserves safe allowed tags', () => {
    const result = sanitizeHtml('<p><strong>Bold</strong> text with <em>emphasis</em></p>');
    expect(result.output).toContain('<p>');
    expect(result.output).toContain('<strong>');
    expect(result.output).toContain('<em>');
  });

  it('removes event attributes', () => {
    const result = sanitizeHtml('<p onclick="hack()">click me</p>');
    expect(result.output).not.toContain('onclick');
  });
});

// ── MCP Tools Registry ────────────────────────────────────────────────────────

describe('ALL_TOOLBOX_TOOLS registry', () => {
  it('contains at least 20 tools', () => {
    expect(ALL_TOOLBOX_TOOLS.length).toBeGreaterThanOrEqual(20);
  });

  it('every tool has name, description, inputSchema, fn', () => {
    for (const tool of ALL_TOOLBOX_TOOLS) {
      expect(typeof tool.name).toBe('string');
      expect(typeof tool.description).toBe('string');
      expect(tool.inputSchema).toBeDefined();
      expect(typeof tool.fn).toBe('function');
    }
  });

  it('tool names are unique', () => {
    const names = ALL_TOOLBOX_TOOLS.map(t => t.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('uuidTool fn returns a uuid', () => {
    const uuidTool = ALL_TOOLBOX_TOOLS.find(t => t.name === 'generateUUID');
    expect(uuidTool).toBeDefined();
    const result = (uuidTool!.fn as () => { uuid: string })();
    expect(result.uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4/i);
  });

  it('hashFnvTool fn returns hash and hex', () => {
    const hashTool = ALL_TOOLBOX_TOOLS.find(t => t.name === 'hashFNV32');
    expect(hashTool).toBeDefined();
    const result = (hashTool!.fn as (i: { input: string }) => { hash: number; hex: string })({ input: 'inception' });
    expect(typeof result.hash).toBe('number');
    expect(typeof result.hex).toBe('string');
  });
});
