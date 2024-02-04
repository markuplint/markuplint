/**
 *
 * @param {import('@markuplint/ml-core').Document} document
 * @param {number} line
 * @param {number} col
 * @param {import("@markuplint/ml-spec").ARIAVersion} ariaVersion
 * @returns
 */
export function getAccessibilityByLocation(document, line, col, ariaVersion) {
	const node = document.searchNodeByLocation(line, col);

	if (!node || !node.is(node.ELEMENT_NODE)) {
		return null;
	}

	const aria = document.getAccessibilityProp(node, ariaVersion);

	return {
		node: node.localName,
		aria,
	};
}
