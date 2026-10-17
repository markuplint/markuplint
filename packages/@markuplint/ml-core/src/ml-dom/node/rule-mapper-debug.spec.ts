import type { MLDocument } from './document.js';
import type { MLNode } from './node.js';

import debug from 'debug';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { RuleMapper } from './rule-mapper.js';

const lowSpecificity = [0, 0, 1] as const;
const highSpecificity = [0, 1, 0] as const;

/**
 * A node whose `toString` counts calls, so a test can tell whether `RuleMapper#set()` built the `%s`
 * argument of its debug-log call.
 */
function createNode() {
	const toString = vi.fn(() => '<div>');
	const node = { uuid: 'uuid-1', nodeName: 'div', rules: {}, toString } as unknown as MLNode<any, any>;
	return { node, toString };
}

function createMapper(node: MLNode<any, any>) {
	return new RuleMapper({ nodeList: [node] } as unknown as MLDocument<any, any>);
}

describe('RuleMapper#set debug logging', () => {
	afterEach(() => {
		debug.disable();
		vi.restoreAllMocks();
	});

	test('does not stringify the node while the logger is disabled', () => {
		debug.disable();
		const { node, toString } = createNode();
		const mapper = createMapper(node);

		mapper.set(node, 'rule-a', { from: 'rules', specificity: lowSpecificity, rule: true });
		mapper.set(node, 'rule-a', { from: 'nodeRules', specificity: lowSpecificity, rule: false });

		expect(toString).not.toHaveBeenCalled();
	});

	test('keeps the higher-specificity rule when a lower one arrives, with the logger disabled', () => {
		debug.disable();
		const { node } = createNode();
		const mapper = createMapper(node);

		mapper.set(node, 'rule-a', { from: 'nodeRules', specificity: highSpecificity, rule: true });
		mapper.set(node, 'rule-a', { from: 'rules', specificity: lowSpecificity, rule: false });
		mapper.apply();

		expect(node.rules).toStrictEqual({ 'rule-a': true });
	});

	test('still emits the Unset message once the logger is enabled after import', () => {
		const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		debug.enable('ml-core:rule-mapper');
		const { node, toString } = createNode();
		const mapper = createMapper(node);

		mapper.set(node, 'rule-a', { from: 'rules', specificity: lowSpecificity, rule: true });
		mapper.set(node, 'rule-a', { from: 'nodeRules', specificity: lowSpecificity, rule: false });

		expect(toString).toHaveBeenCalledOnce();
		expect(write.mock.calls.map(([chunk]) => String(chunk)).join('')).toContain('Unset');
	});
});
