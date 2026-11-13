import type { MLAttr } from './attr.js';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

export class MLNamedNodeMap<T extends RuleConfigValue, O extends PlainData = undefined> extends Array<MLAttr<T, O>> {
	getNamedItem(qualifiedName: string): MLAttr<T, O> | null {
		// An attribute that the framework does not output (`MLAttr#isAbsent`) is not found, as the DOM has none
		return this.find(attr => !attr.isAbsent && attr.isNamedBy(qualifiedName)) ?? null;
	}

	item(index: number): MLAttr<T, O> | null {
		return this[index] ?? null;
	}
}

export function toNamedNodeMap<T extends RuleConfigValue, O extends PlainData = undefined>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	nodes: ReadonlyArray<MLAttr<T, O>>,
): MLNamedNodeMap<T, O> {
	const namedNodeMap = new MLNamedNodeMap(...nodes);
	return namedNodeMap;
}
