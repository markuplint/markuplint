/* eslint-disable unicorn/number-literal-case -- oxfmt writes the digits of a hexadecimal literal in lower case, and this rule asks for upper case */
import { describe, expect, test } from 'vitest';

import { crc32c, crc32cWords, fmix32, fnv1a32, murmur3, nameBytes, xxhash32 } from './hash.ts';

const text = (value: string) => new TextEncoder().encode(value);
const FOX = 'The quick brown fox jumps over the lazy dog';

describe('murmur3', () => {
	test('gives the published values of MurmurHash3 x86 32', () => {
		expect(murmur3(text(''), 0)).toBe(0);
		expect(murmur3(text(''), 1)).toBe(0x51_4e_28_b7);
		expect(murmur3(text(''), 0xff_ff_ff_ff)).toBe(0x81_f1_6f_39);
		expect(murmur3(text('test'), 0)).toBe(0xba_6b_d2_13);
		expect(murmur3(text('Hello, world!'), 0)).toBe(0xc0_36_3e_43);
		expect(murmur3(text('Hello, world!'), 0x97_47_b2_8c)).toBe(0x24_88_4c_ba);
		expect(murmur3(text(FOX), 0)).toBe(0x2e_4f_f7_23);
		expect(murmur3(text(FOX), 0x97_47_b2_8c)).toBe(0x2f_a8_26_cd);
	});

	test('reads the tail of 1, 2 and 3 bytes', () => {
		// The values are from the reference implementation (smhasher), seed 0.
		expect(murmur3(text('a'), 0)).toBe(0x3c_25_69_b2);
		expect(murmur3(text('ab'), 0)).toBe(0x9b_bf_d7_5f);
		expect(murmur3(text('abc'), 0)).toBe(0xb3_dd_93_fa);
	});
});

describe('xxhash32', () => {
	test('gives the published values of XXH32', () => {
		expect(xxhash32(text(''), 0)).toBe(0x02_cc_5d_05);
		expect(xxhash32(text('a'), 0)).toBe(0x55_0d_74_56);
		expect(xxhash32(text('abc'), 0)).toBe(0x32_d1_53_ff);
		expect(xxhash32(text(FOX), 0)).toBe(0xe8_5e_a4_de);
	});
});

describe('fmix32', () => {
	test('is the finalizer of MurmurHash3 and keeps a number unsigned', () => {
		expect(fmix32(0)).toBe(0);
		// MurmurHash3 of nothing with the seed 1 is the finalizer of 1
		expect(fmix32(1)).toBe(0x51_4e_28_b7);
		expect(fmix32(0xff_ff_ff_ff)).toBeGreaterThanOrEqual(0);
		expect(fmix32(0xff_ff_ff_ff)).toBeLessThan(2 ** 32);
	});
});

describe('fnv1a32', () => {
	test('gives the published values of FNV-1a 32', () => {
		expect(fnv1a32(text(''))).toBe(0x81_1c_9d_c5);
		expect(fnv1a32(text('a'))).toBe(0xe4_0c_29_2c);
		expect(fnv1a32(text('foobar'))).toBe(0xbf_9c_f9_68);
	});
});

describe('crc32c', () => {
	test('gives the check value of CRC-32C', () => {
		expect(crc32c(text('123456789'))).toBe(0xe3_06_92_83);
	});

	test('gives the values of RFC 3720 (iSCSI) for 32 bytes of zeros and of ones', () => {
		expect(crc32c(new Uint8Array(32))).toBe(0x8a_91_36_aa);
		expect(crc32c(new Uint8Array(32).fill(0xff))).toBe(0x62_a8_ab_43);
	});

	test('is the same for a byte at a time and for a word at a time', () => {
		const words = Uint32Array.from({ length: 1000 }, (_, index) => Math.imul(index + 1, 0x9e_37_79_b1) >>> 0);
		const bytes = new Uint8Array(words.buffer, words.byteOffset, words.byteLength);
		expect(crc32cWords(words)).toBe(crc32c(bytes));
		expect(crc32cWords(words, 10)).toBe(crc32c(bytes.subarray(0, 40)));
	});

	test('finds a change of one bit', () => {
		const words = Uint32Array.from({ length: 64 }, (_, index) => index);
		const before = crc32cWords(words);
		words[17] = (words[17] ?? 0) ^ 0x01_00_00_00;
		expect(crc32cWords(words)).not.toBe(before);
	});
});

describe('nameBytes', () => {
	test('gives the bytes of an ASCII name and of a name with other characters', () => {
		expect([...nameBytes('a-b')]).toStrictEqual([97, 45, 98]);
		expect([...nameBytes('é')]).toStrictEqual([0xc3, 0xa9]);
		expect([...nameBytes('x-日')]).toStrictEqual([120, 45, 0xe6, 0x97, 0xa5]);
		expect(nameBytes('').length).toBe(0);
	});

	test('gives the bytes of a pair of surrogates, and of a name longer than the buffer', () => {
		expect([...nameBytes('\u{1F600}')]).toStrictEqual([0xf0, 0x9f, 0x98, 0x80]);
		expect([...nameBytes('a\u{1F600}b')]).toStrictEqual([97, 0xf0, 0x9f, 0x98, 0x80, 98]);
		const long = 'x'.repeat(5000);
		expect(nameBytes(long)).toHaveLength(5000);
		expect(nameBytes(long).every(byte => byte === 120)).toBe(true);
	});

	test('does not give back what a longer name left in the buffer', () => {
		nameBytes('a-long-name');
		expect([...nameBytes('ab')]).toStrictEqual([97, 98]);
	});
});
