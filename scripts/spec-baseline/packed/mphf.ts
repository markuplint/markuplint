/**
 * The perfect hash of an index: for `n` keys that are known when the file is built, a function that gives each a
 * slot of its own with one hash, one read of a small table and one read of the slot table, and a verdict on a name that
 * was never a key only after the key at that slot is compared with it.
 *
 * The design is the bucket placement of PTHash, PtrHash (Groot Koerkamp, SEA 2025, https://arxiv.org/abs/2502.15539)
 * and PHast (Beling and Sanders, ALENEX 2026, https://arxiv.org/abs/2504.17918), the line that the surveys of the field
 * (Lehmann et al., "Modern Minimal Perfect Hashing: A Survey", https://arxiv.org/abs/2506.06536) put first for the speed
 * of a query: a key is hashed to a bucket, the bucket holds a pilot, and the pilot decides the slot. Their figures are of
 * 10^8 keys and more, where a lookup is a cache miss; a table of a few hundred keys is in the first-level cache, and
 * what the shorter path costs there is what the measurement of the candidates is for.
 *
 * The details that are not the papers':
 *
 * - The pilots are 16 bits, not 8 and not coded, and the buckets hold 4 keys on average (`n / 4`), so that a perfect
 *   placement with as many slots as keys (the `minimal` mode) is found for any table of this size without a table of the
 *   keys that were left over (PtrHash's remap, PHast's bumping).
 * - The `pow2` mode has the slots of the next power of two of one and a half times the keys, so that the slot is the top bits
 *   of a mixed hash and no multiplication by a range is needed; the cost is the slots that no key has.
 * - The range of a number is reduced by the multiplication of Lemire (`floor(x * range / 2^32)`), which is exact in a
 *   double while the range is below 2^21 (the product is then below 2^53) and which is a 64-bit multiplication in Rust.
 * - The buckets are placed in the order of their size, the largest first, and the smallest pilot that fits is taken, so a
 *   build is deterministic: the same keys in the same order give the same table in every language.
 *
 * @module
 */
import { fmix32 } from './hash.ts';

import { NONE } from './format.ts';

/** The pilots of a bucket: any of these is tried. */
export const PILOT_COUNT = 65_536;

/** How many keys a bucket has on average. */
export const BUCKET_SIZE = 4;

/** How the slots are counted. */
export type MphfMode = 'minimal' | 'pow2';

/** What a lookup needs of a built perfect hash. */
export interface Mphf {
	readonly seed: number;
	readonly buckets: number;
	readonly slots: number;
	/** One pilot for each bucket. */
	readonly pilots: Uint16Array;
	/** For each slot, the position of the key that has it, or {@link NONE}. */
	readonly slotEntry: Uint32Array;
}

/**
 * Reduces a 32-bit number to `[0, range)`.
 *
 * @param value - The number
 * @param range - The range, below 2^21
 * @returns A number below `range`
 */
export function reduce(value: number, range: number): number {
	return Math.floor((value * range) / 4_294_967_296);
}

/**
 * The mix that a pilot brings to the hash of a key.
 *
 * @param pilot - A pilot
 * @returns A 32-bit number
 */
export function pilotMix(pilot: number): number {
	return fmix32(Math.imul(pilot + 1, 0x9E_37_79_B1));
}

/**
 * The number of slots of a perfect hash.
 *
 * @param keys - How many keys
 * @param mode - How the slots are counted
 * @returns The slots
 */
export function slotCount(keys: number, mode: MphfMode): number {
	if (mode === 'minimal') {
		return keys;
	}
	let slots = 2;
	while (slots < keys + (keys >>> 1)) {
		slots *= 2;
	}
	return slots;
}

/**
 * The slot of a key.
 *
 * @param hash - The hash of the key
 * @param pilot - The pilot of its bucket
 * @param slots - The number of slots
 * @param mode - How the slots are counted
 * @returns The slot
 */
export function slotOf(hash: number, pilot: number, slots: number, mode: MphfMode): number {
	const mixed = fmix32((hash ^ pilotMix(pilot)) >>> 0);
	return mode === 'minimal' ? reduce(mixed, slots) : mixed >>> shiftOf(slots);
}

/**
 * The bits that {@link slotOf} shifts a hash out of, for a table of this many slots (a power of two).
 *
 * @param slots - The slots, a power of two of 2 or more
 * @returns `32 - log2(slots)`
 */
export function shiftOf(slots: number): number {
	return Math.clz32(slots) + 1;
}

/**
 * Builds the perfect hash of keys.
 *
 * @param keys - The keys, all different
 * @param hash - The hash function
 * @param mode - How the slots are counted
 * @returns The perfect hash
 * @throws When no seed up to 1,000 gives a placement (it does not happen for a table of a few hundred keys)
 */
export function buildMphf(
	keys: readonly Uint8Array[],
	hash: (bytes: Uint8Array, seed: number) => number,
	mode: MphfMode,
): Mphf {
	const n = keys.length;
	const buckets = Math.max(1, Math.ceil(n / BUCKET_SIZE));
	const slots = slotCount(n, mode);
	for (let seed = 0; seed < 1000; seed++) {
		const hashes = keys.map(key => hash(key, seed));
		if (new Set(hashes).size !== n) {
			continue;
		}
		const members: number[][] = Array.from({ length: buckets }, () => []);
		for (const [position, value] of hashes.entries()) {
			members[reduce(value, buckets)]?.push(position);
		}
		const order = members
			.map((bucket, id) => ({ id, size: bucket.length }))
			.filter(bucket => bucket.size > 0)
			.toSorted((a, b) => b.size - a.size || a.id - b.id);

		const used = new Uint8Array(slots);
		const pilots = new Uint16Array(buckets);
		const slotEntry = new Uint32Array(slots).fill(NONE);
		let placed = true;
		for (const { id } of order) {
			const bucket = members[id] ?? [];
			let found = false;
			for (let pilot = 0; pilot < PILOT_COUNT && !found; pilot++) {
				const taken: number[] = [];
				let fits = true;
				for (const position of bucket) {
					const slot = slotOf(hashes[position] ?? 0, pilot, slots, mode);
					if (used[slot] === 1) {
						fits = false;
						break;
					}
					used[slot] = 1;
					taken.push(slot);
				}
				if (fits) {
					found = true;
					pilots[id] = pilot;
					for (const [index, slot] of taken.entries()) {
						slotEntry[slot] = bucket[index] ?? NONE;
					}
				} else {
					for (const slot of taken) {
						used[slot] = 0;
					}
				}
			}
			if (!found) {
				placed = false;
				break;
			}
		}
		if (placed) {
			return { seed, buckets, slots, pilots, slotEntry };
		}
	}
	throw new Error(`No perfect hash of ${n} keys was found`);
}

/**
 * Finds the position of a key in a table that {@link buildMphf} made. The reader of a file takes the same steps on the
 * words of the index (`read.ts`); this is the one that the specs use to prove that the construction is a perfect hash.
 *
 * @param mphf - The perfect hash
 * @param hash - The hash function
 * @param bytes - The name that is asked
 * @param mode - How the slots are counted
 * @returns The position that the slot of the name holds, which is the position of the name only if the key there is compared
 */
export function lookupMphf(
	mphf: Mphf,
	hash: (bytes: Uint8Array, seed: number) => number,
	bytes: Uint8Array,
	mode: MphfMode,
): number {
	const value = hash(bytes, mphf.seed);
	const pilot = mphf.pilots[reduce(value, mphf.buckets)] ?? 0;
	return mphf.slotEntry[slotOf(value, pilot, mphf.slots, mode)] ?? NONE;
}
