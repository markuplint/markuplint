import type { ARIAVersion } from '@markuplint/ml-spec';
import type { MLEngine } from 'markuplint';

import { searchNodeAtLocation } from '@markuplint/ml-core';

export async function getAccessibilityByLocation(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	engine: MLEngine,
	line: number,
	col: number,
	ariaVersion: ARIAVersion,
) {
	if (!engine?.document) {
		await engine.exec();
	}

	if (!engine?.document) {
		return null;
	}

	// The engine is the markuplint the user installed, whose `searchNodeByLocation` may be of an older
	// version (one that compared the line and the column apart and took the end of a range in), so the
	// node list is searched here, by the rule of this version.
	const node = searchNodeAtLocation(engine.document.nodeList, line, col);

	if (!node || !node.is(node.ELEMENT_NODE)) {
		return null;
	}

	const aria = engine.document.getAccessibilityProp(node, ariaVersion);

	return {
		node: node.localName,
		aria,
	};
}
