/* eslint-disable unicorn/prefer-math-trunc -- `x | 0` wraps a number to 32 bits, which a hash needs; `Math.trunc` does not */

/**
 * The hash functions and the checksum of the packed candidates. The same functions are in
 * `crates/markuplint-types/examples/packed_candidates/hash.rs`, and a candidate that is built here is read there, so
 * the two have to give the same 32-bit numbers for the same bytes (the vectors of the specs are the shared proof).
 *
 * - {@link murmur3} and {@link xxhash32} hash the name of a table's key for the index. Only functions of 32-bit
 *   operations are here: a 64-bit multiplication is a `BigInt` in JavaScript, and `rapidhash` and XXH3, the usual choice
 *   for short keys, need it. Whichever of the two is chosen for a candidate is written in its header. A
 *   hash that collides is never a wrong answer: a lookup ends with a comparison of the key itself.
 * - {@link crc32c} is the checksum of the whole file. CRC-32C (Castagnoli) keeps a Hamming distance of 4 (every error
 *   of 3 bits or fewer is found) up to 2,147,483,615 bits, where the CRC-32 of IEEE 802.3, which Node.js has
 *   (`zlib.crc32`), keeps it only up to 91,607 bits: the file is a few million bits (Koopman's CRC zoo,
 *   https://users.ece.cmu.edu/~koopman/crc/crc32.html). Node.js has no CRC-32C, so it is a table here.
 *
 * Every function takes and gives unsigned 32-bit integers (`>>> 0`).
 *
 * @module
 */

const encoder = new TextEncoder();

/** A buffer that the bytes of an ASCII name are written to, so that hashing a name allocates nothing. */
const scratch = new Uint8Array(4096);

/**
 * The UTF-8 bytes of a name. The data of `html-spec` is all ASCII, and the bytes are then copied into a buffer that
 * is reused: the result is valid until the next call.
 *
 * @param text - The name
 * @returns The bytes
 */
export function nameBytes(text: string): Uint8Array {
	const { length } = text;
	if (length > scratch.length) {
		return encoder.encode(text);
	}
	for (let i = 0; i < length; i++) {
		// A character that is not ASCII, a pair of surrogates included, is above 127
		const code = text.codePointAt(i) ?? 0;
		if (code > 127) {
			return encoder.encode(text);
		}
		scratch[i] = code;
	}
	return scratch.subarray(0, length);
}

/**
 * The finalizer of MurmurHash3: every bit of the input changes about half of the bits of the output.
 *
 * @param input - A 32-bit integer
 * @returns The mixed integer
 */
export function fmix32(input: number): number {
	let h = input | 0;
	h ^= h >>> 16;
	h = Math.imul(h, 0x85_EB_CA_6B);
	h ^= h >>> 13;
	h = Math.imul(h, 0xC2_B2_AE_35);
	h ^= h >>> 16;
	return h >>> 0;
}

const rotl = (value: number, bits: number): number => (value << bits) | (value >>> (32 - bits));

/**
 * MurmurHash3, x86, 32 bits.
 *
 * @param bytes - The key
 * @param seed - The seed
 * @returns The hash
 */
export function murmur3(bytes: Uint8Array, seed: number): number {
	const c1 = 0xCC_9E_2D_51;
	const c2 = 0x1B_87_35_93;
	const { length } = bytes;
	let h = seed | 0;
	const blocks = length - (length % 4);
	for (let i = 0; i < blocks; i += 4) {
		let k =
			(bytes[i] ?? 0) | ((bytes[i + 1] ?? 0) << 8) | ((bytes[i + 2] ?? 0) << 16) | ((bytes[i + 3] ?? 0) << 24);
		k = Math.imul(k, c1);
		k = rotl(k, 15);
		k = Math.imul(k, c2);
		h ^= k;
		h = rotl(h, 13);
		h = (Math.imul(h, 5) + 0xE6_54_6B_64) | 0;
	}
	let k = 0;
	switch (length % 4) {
		case 3: {
			k ^= (bytes[blocks + 2] ?? 0) << 16;
		}
		// falls through
		case 2: {
			k ^= (bytes[blocks + 1] ?? 0) << 8;
		}
		// falls through
		case 1: {
			k ^= bytes[blocks] ?? 0;
			k = Math.imul(k, c1);
			k = rotl(k, 15);
			k = Math.imul(k, c2);
			h ^= k;
		}
	}
	h ^= length;
	return fmix32(h);
}

const P1 = 0x9E_37_79_B1;
const P2 = 0x85_EB_CA_77;
const P3 = 0xC2_B2_AE_3D;
const P4 = 0x27_D4_EB_2F;
const P5 = 0x16_56_67_B1;

const read32 = (bytes: Uint8Array, at: number): number =>
	(bytes[at] ?? 0) | ((bytes[at + 1] ?? 0) << 8) | ((bytes[at + 2] ?? 0) << 16) | ((bytes[at + 3] ?? 0) << 24) | 0;

/**
 * xxHash, 32 bits (XXH32).
 *
 * @param bytes - The key
 * @param seed - The seed
 * @returns The hash
 */
export function xxhash32(bytes: Uint8Array, seed: number): number {
	const { length } = bytes;
	let at = 0;
	let h: number;
	if (length >= 16) {
		let v1 = (seed + P1 + P2) | 0;
		let v2 = (seed + P2) | 0;
		let v3 = seed | 0;
		let v4 = (seed - P1) | 0;
		const limit = length - 16;
		while (at <= limit) {
			v1 = Math.imul(rotl((v1 + Math.imul(read32(bytes, at), P2)) | 0, 13), P1);
			v2 = Math.imul(rotl((v2 + Math.imul(read32(bytes, at + 4), P2)) | 0, 13), P1);
			v3 = Math.imul(rotl((v3 + Math.imul(read32(bytes, at + 8), P2)) | 0, 13), P1);
			v4 = Math.imul(rotl((v4 + Math.imul(read32(bytes, at + 12), P2)) | 0, 13), P1);
			at += 16;
		}
		h = (rotl(v1, 1) + rotl(v2, 7) + rotl(v3, 12) + rotl(v4, 18)) | 0;
	} else {
		h = (seed + P5) | 0;
	}
	h = (h + length) | 0;
	while (at + 4 <= length) {
		h = Math.imul(rotl((h + Math.imul(read32(bytes, at), P3)) | 0, 17), P4);
		at += 4;
	}
	while (at < length) {
		h = Math.imul(rotl((h + Math.imul(bytes[at] ?? 0, P5)) | 0, 11), P1);
		at++;
	}
	h ^= h >>> 15;
	h = Math.imul(h, P2);
	h ^= h >>> 13;
	h = Math.imul(h, P3);
	h ^= h >>> 16;
	return h >>> 0;
}

/** The hash function of an index, by the number that a header holds. */
export const HASHES = { 0: murmur3, 1: xxhash32 } as const satisfies Record<
	number,
	(bytes: Uint8Array, seed: number) => number
>;

/**
 * FNV-1a, 32 bits: the digest of a string that a question's answer is made of (not a hash of an index).
 *
 * @param bytes - The bytes
 * @returns The hash
 */
export function fnv1a32(bytes: Uint8Array): number {
	let h = 0x81_1C_9D_C5;
	for (const byte of bytes) {
		h ^= byte;
		h = Math.imul(h, 0x01_00_01_93);
	}
	return h >>> 0;
}

/** The tables of CRC-32C: `TABLES[0]` is the table of a byte, and the others are the same byte followed by 1 to 3 zero bytes. */
const TABLES: readonly Uint32Array[] = (() => {
	const tables = Array.from({ length: 4 }, () => new Uint32Array(256));
	const [t0, t1, t2, t3] = tables as [Uint32Array, Uint32Array, Uint32Array, Uint32Array];
	for (let i = 0; i < 256; i++) {
		let crc = i;
		for (let bit = 0; bit < 8; bit++) {
			crc = crc & 1 ? (crc >>> 1) ^ 0x82_F6_3B_78 : crc >>> 1;
		}
		t0[i] = crc >>> 0;
	}
	for (let i = 0; i < 256; i++) {
		const first = t0[i] ?? 0;
		t1[i] = ((first >>> 8) ^ (t0[first & 0xFF] ?? 0)) >>> 0;
		const second = t1[i] ?? 0;
		t2[i] = ((second >>> 8) ^ (t0[second & 0xFF] ?? 0)) >>> 0;
		const third = t2[i] ?? 0;
		t3[i] = ((third >>> 8) ^ (t0[third & 0xFF] ?? 0)) >>> 0;
	}
	return tables;
})();

/**
 * CRC-32C of bytes, one byte at a time: the reference that {@link crc32cWords} has to equal.
 *
 * @param bytes - The data
 * @returns The checksum
 */
export function crc32c(bytes: Uint8Array): number {
	const [t0] = TABLES as [Uint32Array];
	let crc = 0xFF_FF_FF_FF;
	for (const byte of bytes) {
		crc = (crc >>> 8) ^ (t0[(crc ^ byte) & 0xFF] ?? 0);
	}
	return (crc ^ 0xFF_FF_FF_FF) >>> 0;
}

/**
 * CRC-32C of 32-bit little-endian words, four bytes at a time (the same value as {@link crc32c} of their bytes).
 *
 * @param words - The data
 * @param count - How many words to read, from the start
 * @returns The checksum
 */
export function crc32cWords(words: Uint32Array, count: number = words.length): number {
	const [t0, t1, t2, t3] = TABLES as [Uint32Array, Uint32Array, Uint32Array, Uint32Array];
	let crc = 0xFF_FF_FF_FF;
	for (let i = 0; i < count; i++) {
		crc ^= words[i] ?? 0;
		crc =
			(t3[crc & 0xFF] ?? 0) ^
			(t2[(crc >>> 8) & 0xFF] ?? 0) ^
			(t1[(crc >>> 16) & 0xFF] ?? 0) ^
			(t0[crc >>> 24] ?? 0);
	}
	return (crc ^ 0xFF_FF_FF_FF) >>> 0;
}
