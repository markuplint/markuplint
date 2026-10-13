import type { ARIAVersion } from '@markuplint/ml-spec';
import type { MLEngine } from 'markuplint';

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
