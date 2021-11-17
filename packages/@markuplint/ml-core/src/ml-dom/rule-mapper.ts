import type { AnonymousNode } from './types';
import type { AnyRule } from '@markuplint/ml-config';

import { log as coreLog } from '../debug';

const ruleMapperLog = coreLog.extend('rule-mapper');
const ruleMapperNodeLog = ruleMapperLog.extend('node');
const ruleMapperNodeRuleLog = ruleMapperNodeLog.extend('rule');

type RuleType = 'rules' | 'nodeRules' | 'childNodeRules';

type MappingLayer = {
	from: RuleType;
	index: number;
	rule: AnyRule;
};

export class RuleMapper<N extends AnonymousNode<any, any> = AnonymousNode<any, any>> {
	#nodeList: ReadonlyArray<N>;
	#ruleMap = new Map<string, Record<string, MappingLayer>>();

	constructor(nodeList: ReadonlyArray<N>) {
		this.#nodeList = nodeList;
	}

	set(node: N, ruleName: string, rule: MappingLayer) {
		const rules = this.#ruleMap.get(node.uuid) || {};
		const currentRule = rules[ruleName];
		if (currentRule) {
			if (currentRule.index <= rule.index) {
				ruleMapperLog('Unset %o from %s', currentRule, node);
			} else {
				ruleMapperLog("Don't set %o (%d vs %d)", rule, currentRule.index, rule.index);
				return;
			}
		}
		rules[ruleName] = rule;
		this.#ruleMap.set(node.uuid, rules);
		ruleMapperLog('Set %o to %s', rule, node);
	}

	apply() {
		ruleMapperLog('ruleTree:');

		this.#nodeList.forEach(node => {
			const rules = this.#ruleMap.get(node.uuid);
			if (!rules) {
				return;
			}
			const shash = node.type === 'ElementCloseTag' ? '/' : '';
			const nodeName = 'nodeName' in node ? node.nodeName : `#${node.type}`;
			ruleMapperNodeLog('<%s%s>', shash, nodeName);
			Object.keys(rules).forEach(ruleName => {
				const rule = rules[ruleName];
				node.rules[ruleName] = rule.rule;
				ruleMapperNodeRuleLog('[from: %s(%d)] %s: %o', rule.from, rule.index, ruleName, rule.rule);
			});
		});
	}
}
