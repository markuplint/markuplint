/** Above this many table cells the line alignment is skipped and the whole text is shown as replaced. */
const MAX_CELLS = 4_000_000;

type Edit = { readonly op: ' ' | '-' | '+'; readonly text: string };

/**
 * Puts every sentence of normalized spec text on its own line.
 *
 * A section is hashed and stored as one line, which a line diff cannot make
 * readable; sentence lines let the diff in a report point at the changed sentence.
 */
export function splitSentences(text: string): string {
	return text
		.split(/(?<=[.!?])\s+|(?<=。)/)
		.filter(sentence => sentence !== '')
		.join('\n');
}

function align(a: readonly string[], b: readonly string[]): Edit[] {
	const width = b.length + 1;
	const table = new Uint32Array((a.length + 1) * width);
	for (let i = a.length - 1; i >= 0; i--) {
		for (let j = b.length - 1; j >= 0; j--) {
			table[i * width + j] =
				a[i] === b[j]
					? (table[(i + 1) * width + j + 1] ?? 0) + 1
					: Math.max(table[(i + 1) * width + j] ?? 0, table[i * width + j + 1] ?? 0);
		}
	}
	const edits: Edit[] = [];
	let i = 0;
	let j = 0;
	while (i < a.length && j < b.length) {
		if (a[i] === b[j]) {
			edits.push({ op: ' ', text: a[i] ?? '' });
			i++;
			j++;
		} else if ((table[(i + 1) * width + j] ?? 0) >= (table[i * width + j + 1] ?? 0)) {
			edits.push({ op: '-', text: a[i] ?? '' });
			i++;
		} else {
			edits.push({ op: '+', text: b[j] ?? '' });
			j++;
		}
	}
	for (; i < a.length; i++) {
		edits.push({ op: '-', text: a[i] ?? '' });
	}
	for (; j < b.length; j++) {
		edits.push({ op: '+', text: b[j] ?? '' });
	}
	return edits;
}

/** A unified diff of two texts, line by line. Empty when they are equal. */
export function unifiedDiff(before: string, after: string, context = 2): string {
	if (before === after) {
		return '';
	}
	const a = before.split('\n');
	const b = after.split('\n');
	const edits: Edit[] =
		a.length * b.length > MAX_CELLS
			? [...a.map((text): Edit => ({ op: '-', text })), ...b.map((text): Edit => ({ op: '+', text }))]
			: align(a, b);

	const oldNo: number[] = [];
	const newNo: number[] = [];
	let o = 1;
	let n = 1;
	for (const edit of edits) {
		oldNo.push(o);
		newNo.push(n);
		if (edit.op !== '+') {
			o++;
		}
		if (edit.op !== '-') {
			n++;
		}
	}

	const changes = edits.flatMap((edit, index) => (edit.op === ' ' ? [] : [index]));
	const ranges: [number, number][] = [];
	for (const index of changes) {
		const last = ranges.at(-1);
		if (last !== undefined && index - last[1] <= 2 * context + 1) {
			last[1] = index;
		} else {
			ranges.push([index, index]);
		}
	}

	return ranges
		.map(([first, last]) => {
			const from = Math.max(0, first - context);
			const to = Math.min(edits.length - 1, last + context);
			const slice = edits.slice(from, to + 1);
			const oldCount = slice.filter(e => e.op !== '+').length;
			const newCount = slice.filter(e => e.op !== '-').length;
			return [
				`@@ -${oldNo[from]},${oldCount} +${newNo[from]},${newCount} @@`,
				...slice.map(e => `${e.op}${e.text}`),
			].join('\n');
		})
		.join('\n');
}
