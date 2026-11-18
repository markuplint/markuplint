/**
 * The order of the nodes of a region that an encoder makes: by their tag, then by how many items or entries they have, then by
 * the position of their index and by their first field as the walk of `encode.ts` numbered them (a string number, a value, the
 * position of a list), and the walk's own number for the rest. What is the same is then together in the words (all the nodes
 * that have a string, all the arrays of three items), which is what a compressor needs; a reader asks for nothing of the
 * order, since it reaches a node by the number that a list or the root holds. The Rust program has the same pass
 * (`crates/markuplint-types/examples/packed_candidates/encode.rs`), and the bytes are the same.
 *
 * What moves is the numbers of the nodes, which only the lists and the root hold: a node holds no number of another node, only
 * the position of its list and of its index. The lists are written again in the order of the first node that has them, with
 * the numbers of the nodes that moved. A list that an array and an object have together (the same words, which the walk
 * shares) is two lists now, since the words of an object hold the keys that no number moves.
 *
 * @module
 */
import { BARE_FLAG, Tag } from './format.ts';

/**
 * Numbers the nodes of the words of a region again.
 *
 * @param words - The section of a region: the counts, the root, the nodes, the lists, the indexes
 * @param columns - Whether the nodes, and the keys and values of an object, are in columns
 * @param bare - Whether the indexes of objects have no keys, and say where the list of an object that has them is: the lists are
 *   written again, so they are told the new position (a perfect hash only)
 * @returns The section of the same region with its nodes grouped
 * @throws When the section is not as long as its header says, its root is not one of its nodes, a list is not inside the lists
 *   or holds a node that the region lacks, or an index refers to a list that no object has, as the Rust pass does
 */
export function groupRegion(words: Uint32Array, columns: boolean, bare = false): Uint32Array {
	const count = words[0] ?? 0;
	const listWords = words[1] ?? 0;
	const indexWords = words[2] ?? 0;
	const root = words[3] ?? 0;
	if (words.length !== 4 + 4 * count + listWords + indexWords || root >= count) {
		throw new Error('A region is not as long as its header says');
	}
	const listsAt = 4 + 4 * count;
	const indexesAt = listsAt + listWords;
	const field = (field: number, node: number): number =>
		words[columns ? 4 + field * count + node : 4 + 4 * node + field] ?? 0;

	// The four fields of every node, read once: the comparison below asks for them O(n log n) times
	const fields = [0, 1, 2, 3].map(f => Uint32Array.from({ length: count }, (_, node) => field(f, node)));
	const [tags = new Uint32Array(0), firsts = tags, counts = tags, indexes = tags] = fields;
	const order = Array.from({ length: count }, (_, node) => node).toSorted(
		(x, y) =>
			(tags[x] ?? 0) - (tags[y] ?? 0) ||
			(counts[x] ?? 0) - (counts[y] ?? 0) ||
			(indexes[x] ?? 0) - (indexes[y] ?? 0) ||
			(firsts[x] ?? 0) - (firsts[y] ?? 0) ||
			x - y,
	);
	const renumbered = new Uint32Array(count);
	for (const [position, node] of order.entries()) {
		renumbered[node] = position;
	}

	const moved = (item: number): number => {
		const position = renumbered[item];
		if (position === undefined) {
			throw new Error('A list holds a node that the region lacks');
		}
		return position;
	};

	const lists: number[] = [];
	// The lists that were made, by their old position: the new position, and how many items or entries they were made for
	const arrays = new Map<number, { made: number; items: number }>();
	const objects = new Map<number, { made: number; items: number }>();
	const nodes = new Uint32Array(4 * count);
	for (const [position, node] of order.entries()) {
		const tag = field(0, node);
		const items = field(2, node);
		let a = field(1, node);
		// An empty array or object has no list, and its `a` is 0 as the encoder wrote it; a reader does not use it
		if ((tag === Tag.Array || tag === Tag.Object) && items > 0) {
			const known = (tag === Tag.Array ? arrays : objects).get(a);
			if (known === undefined) {
				const at = listsAt + a;
				const made = lists.length;
				// The words of the list: the nodes of an array, or the keys and the nodes of an object
				if (a + (tag === Tag.Array ? items : 2 * items) > listWords) {
					throw new Error('A list is not inside the lists of its region');
				}
				if (tag === Tag.Array) {
					for (let item = 0; item < items; item++) {
						lists.push(moved(words[at + item] ?? 0));
					}
				} else if (columns) {
					for (let entry = 0; entry < items; entry++) {
						lists.push(words[at + entry] ?? 0);
					}
					for (let entry = 0; entry < items; entry++) {
						lists.push(moved(words[at + items + entry] ?? 0));
					}
				} else {
					for (let entry = 0; entry < items; entry++) {
						lists.push(words[at + 2 * entry] ?? 0, moved(words[at + 2 * entry + 1] ?? 0));
					}
				}
				(tag === Tag.Array ? arrays : objects).set(a, { made, items });
				a = made;
			} else {
				// The encoder shares a list only when its words are the same, which gives the same count; a list that two
				// nodes share with different counts would be one of them cut or lengthened without a sign
				if (known.items !== items) {
					throw new Error(`Two nodes share a list with ${known.items} and ${items} items`);
				}
				a = known.made;
			}
		}
		nodes[4 * position] = tag;
		nodes[4 * position + 1] = a;
		nodes[4 * position + 2] = items;
		nodes[4 * position + 3] = field(3, node);
	}

	const section = new Uint32Array(4 + 4 * count + lists.length + indexWords);
	section[0] = count;
	section[1] = lists.length;
	section[2] = indexWords;
	section[3] = moved(root);
	if (columns) {
		for (let position = 0; position < count; position++) {
			for (let f = 0; f < 4; f++) {
				section[4 + f * count + position] = nodes[4 * position + f] ?? 0;
			}
		}
	} else {
		section.set(nodes, 4);
	}
	section.set(lists, listsAt);
	const indexRecords = words.slice(indexesAt, indexesAt + indexWords);
	if (bare) {
		told(indexRecords, objects);
	}
	section.set(indexRecords, listsAt + lists.length);
	return section;
}

/**
 * Tells the indexes without keys where the list of their object is now: the last word of such a record is the position of a list,
 * which the lists that were written again have at another one.
 *
 * @param indexes - The words of the indexes of a region, which are changed
 * @param objects - The lists of objects that were written again, by their old position
 * @throws When a record is not inside the indexes, or its list was not written again (no object has it)
 */
function told(indexes: Uint32Array, objects: ReadonlyMap<number, { made: number }>): void {
	let at = 0;
	while (at < indexes.length) {
		const entries = indexes[at] ?? 0;
		const marked = indexes[at + 1] ?? 0;
		const isBare = (marked & BARE_FLAG) !== 0;
		const length = 5 + Math.ceil((indexes[at + 3] ?? 0) / 2) + (indexes[at + 4] ?? 0) + (isBare ? 1 : entries);
		if (at + length > indexes.length) {
			throw new Error('An index is not inside the indexes of its region');
		}
		if (isBare) {
			const list = objects.get(indexes[at + length - 1] ?? 0);
			if (!list) {
				throw new Error(`The index at ${at} has no keys and no object has the list that it refers to`);
			}
			indexes[at + length - 1] = list.made;
		}
		at += length;
	}
}
