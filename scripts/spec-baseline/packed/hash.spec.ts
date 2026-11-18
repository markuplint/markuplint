import { describe, expect, test } from 'vitest';

import { crc32c, crc32cWords, fmix32, fnv1a32, murmur3, nameBytes, xxhash32 } from './hash.ts';

const text = (value: string) => new TextEncoder().encode(value);
const FOX = 'The quick brown fox jumps over the lazy dog';

describe('murmur3', () => {
	test('gives the published values of MurmurHash3 x86 32', () => {
		expect(murmur3(text(''), 0)).toBe(0);
		expect(murmur3(text(''), 1)).toBe(0x51_4E_28_B7);
		expect(murmur3(text(''), 0xFF_FF_FF_FF)).toBe(0x81_F1_6F_39);
		expect(murmur3(text('test'), 0)).toBe(0xBA_6B_D2_13);
		expect(murmur3(text('Hello, world!'), 0)).toBe(0xC0_36_3E_43);
		expect(murmur3(text('Hello, world!'), 0x97_47_B2_8C)).toBe(0x24_88_4C_BA);
		expect(murmur3(text(FOX), 0)).toBe(0x2E_4F_F7_23);
		expect(murmur3(text(FOX), 0x97_47_B2_8C)).toBe(0x2F_A8_26_CD);
	});

	test('reads the tail of 1, 2 and 3 bytes', () => {
		// The values are from the reference implementation (smhasher), seed 0.
		expect(murmur3(text('a'), 0)).toBe(0x3C_25_69_B2);
		expect(murmur3(text('ab'), 0)).toBe(0x9B_BF_D7_5F);
		expect(murmur3(text('abc'), 0)).toBe(0xB3_DD_93_FA);
	});
});

describe('xxhash32', () => {
	test('gives the published values of XXH32', () => {
		expect(xxhash32(text(''), 0)).toBe(0x02_CC_5D_05);
		expect(xxhash32(text('a'), 0)).toBe(0x55_0D_74_56);
		expect(xxhash32(text('abc'), 0)).toBe(0x32_D1_53_FF);
		expect(xxhash32(text(FOX), 0)).toBe(0xE8_5E_A4_DE);
	});
});

describe('fmix32', () => {
	test('is the finalizer of MurmurHash3 and keeps a number unsigned', () => {
		expect(fmix32(0)).toBe(0);
		// MurmurHash3 of nothing with the seed 1 is the finalizer of 1
		expect(fmix32(1)).toBe(0x51_4E_28_B7);
		expect(fmix32(0xFF_FF_FF_FF)).toBeGreaterThanOrEqual(0);
		expect(fmix32(0xFF_FF_FF_FF)).toBeLessThan(2 ** 32);
	});
});

describe('fnv1a32', () => {
	test('gives the published values of FNV-1a 32', () => {
		expect(fnv1a32(text(''))).toBe(0x81_1C_9D_C5);
		expect(fnv1a32(text('a'))).toBe(0xE4_0C_29_2C);
		expect(fnv1a32(text('foobar'))).toBe(0xBF_9C_F9_68);
	});
});

describe('crc32c', () => {
	test('gives the check value of CRC-32C', () => {
		expect(crc32c(text('123456789'))).toBe(0xE3_06_92_83);
	});

	test('gives the values of RFC 3720 (iSCSI) for 32 bytes of zeros and of ones', () => {
		expect(crc32c(new Uint8Array(32))).toBe(0x8A_91_36_AA);
		expect(crc32c(new Uint8Array(32).fill(0xFF))).toBe(0x62_A8_AB_43);
	});

	test('is the same for a byte at a time and for a word at a time', () => {
		const words = Uint32Array.from({ length: 1000 }, (_, index) => Math.imul(index + 1, 0x9E_37_79_B1) >>> 0);
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
		expect([...nameBytes('é')]).toStrictEqual([0xC3, 0xA9]);
		expect([...nameBytes('x-日')]).toStrictEqual([120, 45, 0xE6, 0x97, 0xA5]);
		expect(nameBytes('').length).toBe(0);
	});

	test('gives the bytes of a pair of surrogates, and of a name longer than the buffer', () => {
		expect([...nameBytes('\u{1F600}')]).toStrictEqual([0xF0, 0x9F, 0x98, 0x80]);
		expect([...nameBytes('a\u{1F600}b')]).toStrictEqual([97, 0xF0, 0x9F, 0x98, 0x80, 98]);
		const long = 'x'.repeat(5000);
		expect(nameBytes(long)).toHaveLength(5000);
		expect(nameBytes(long).every(byte => byte === 120)).toBe(true);
	});

	test('does not give back what a longer name left in the buffer', () => {
		nameBytes('a-long-name');
		expect([...nameBytes('ab')]).toStrictEqual([97, 98]);
	});
});
