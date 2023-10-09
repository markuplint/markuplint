/**
 *
 * @param {import('markuplint').MLEngine} engine
 * @param {number} line
 * @param {number} col
 * @param {import("@markuplint/ml-spec").ARIAVersion} ariaVersion
 * @returns
 */
export function getAccessibilityByLocation(engine, line, col, ariaVersion) {
	if (!engine || !engine.document) {
		return null;
	}

	const node = engine.document.searchNodeByLocation(line, col);

	if (!node || !node.is(node.ELEMENT_NODE)) {
		return null;
	}

	const aria = engine.document.getAccessibilityProp(node, ariaVersion);

	return {
		node: node.localName,
		aria,
	};
}
