/**
 * Moves every position found in `value` one character later, in place: the
 * positions a tokenizer reports for a source whose leading BOM it did not see.
 *
 * A parser whose library strips the BOM itself (`pug-lexer`, `remark`) counts
 * from the character after it. Parsing the source without the BOM keeps `raw`
 * and the slices consistent, and this puts the positions back where the source
 * that `fix` edits has them. The BOM itself belongs to no node, as the HTML
 * Standard skips it.
 *
 * A token (`offset`, `line`, `col`) and a parse error (`startOffset` … `endCol`)
 * are recognised by their keys, whatever plain object carries them, so it is only
 * safe on what the parser itself produced (the node list and the parse errors); an
 * instance of a class is not entered. The
 * column moves only for a position on the first line, the one the BOM is on. A
 * token that several nodes refer to is moved once.
 *
 * @param value - A node list, a node, a token or a list of parse errors
 * @param length - How many characters later the positions move
 * @see https://html.spec.whatwg.org/multipage/parsing.html#the-input-byte-stream
 * > A leading Byte Order Mark (BOM) causes the character encoding argument to be ignored and will itself be skipped.
 */
export function shiftPositions(value: unknown, length = 1): void {
	walk(value, length, new WeakSet());
}

function walk(value: unknown, length: number, seen: WeakSet<object>): void {
	if (typeof value !== 'object' || value === null || seen.has(value)) {
		return;
	}
	seen.add(value);

	if (Array.isArray(value)) {
		for (const item of value) {
			walk(item, length, seen);
		}
		return;
	}

	// A node and a token are plain objects; an instance of a class is state that something else holds
	const prototype = Object.getPrototypeOf(value) as unknown;
	if (prototype !== Object.prototype && prototype !== null) {
		return;
	}

	const record = value as Record<string, unknown>;
	shift(record, 'offset', 'line', 'col', length);
	shift(record, 'startOffset', 'startLine', 'startCol', length);
	shift(record, 'endOffset', 'endLine', 'endCol', length);

	for (const child of Object.values(record)) {
		walk(child, length, seen);
	}
}

function shift(record: Record<string, unknown>, offsetKey: string, lineKey: string, colKey: string, length: number) {
	const { [offsetKey]: offset, [lineKey]: line, [colKey]: col } = record;
	if (typeof offset !== 'number' || typeof line !== 'number' || typeof col !== 'number') {
		return;
	}
	record[offsetKey] = offset + length;
	if (line === 1) {
		record[colKey] = col + length;
	}
}
