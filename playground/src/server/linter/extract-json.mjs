const DIRECTIVE_OPEN = '{{{ml-json-start}}}';
const DIRECTIVE_CLOSE = '{{{ml-json-end}}}';

/**
 * If the value is JSON enclosed in directives, extract the value and parse the JSON to get the value.
 * @param {string} str
 */
export function extractJson(str) {
	if (!str.startsWith(DIRECTIVE_OPEN) || !str.endsWith(DIRECTIVE_CLOSE)) {
		return null;
	}

	return JSON.parse(str.slice(DIRECTIVE_OPEN.length, -DIRECTIVE_CLOSE.length));
}

/**
 * Make the payload a string enclosed in directives.
 * @param {any} payload
 * @param {(key: string, value: any) => any} [replacer]
 */
export function createJsonPayload(payload, replacer) {
	return DIRECTIVE_OPEN + JSON.stringify(payload, replacer) + DIRECTIVE_CLOSE;
}
