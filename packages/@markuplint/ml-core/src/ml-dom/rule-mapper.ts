import type { Specificity } from './helper/selector';
import type { AnonymousNode } from './types';
import type { AnyRule } from '@markuplint/ml-config';

import { log as coreLog } from '../debug';

import { compareSpecificity } from './helper/selector';

const ruleMapperLog = coreLog.extend('rule-mapper');
const ruleMapperNodeLog = ruleMapperLog.extend('node');
const ruleMapperNodeRuleLog = ruleMapperNodeLog.extend('rule');

type RuleType = 'rules' | 'nodeRules' | 'childNodeRules';

type MappingLayer = {
	from: RuleType;
	specificity: Specificity;
	rule: AnyRule;
};

export class RuleMapper<N extends AnonymousNode<any, any> = AnonymousNode<any, any>> {
	#nodeList: ReadonlyArray<N>;
	#ruleMap = new Map<string, Record<string, MappingLayer>>();

	constructor(nodeList: ReadonlyArray<N>) {
		this.#nodeList = nodeList;
	}

	set(node: N, ruleName: string, rule: MappingLayer) {
		if (node.type === 'ElementCloseTag') {
			return;
		}
		const rules = this.#ruleMap.get(node.uuid) || {};
		const currentRule = rules[ruleName];
		if (currentRule) {
			const order = compareSpecificity(currentRule.specificity, rule.specificity);
			if (order === 1) {
				ruleMapperLog("Don't set %o ([%s] vs [%s])", rule, currentRule.specificity, rule.specificity);
				return;
			}
			ruleMapperLog('Unset %o from %s', currentRule, node);
		}
		rules[ruleName] = rule;
		this.#ruleMap.set(node.uuid, rules);
		if (node.type === 'Element' && node.closeTag) {
			this.#ruleMap.set(node.closeTag.uuid, rules);
		}
		ruleMapperLog('Set %o to %s', rule, node);
	}

	apply() {
		ruleMapperLog('ruleTree:');

		this.#nodeList.forEach(node => {
			const rules = this.#ruleMap.get(node.uuid);
			if (!rules) {
				return;
			}
			const slash = node.type === 'ElementCloseTag' ? '/' : '';
			const nodeName = 'nodeName' in node ? node.nodeName : `#${node.type}`;
			ruleMapperNodeLog('<%s%s>', slash, nodeName);
			Object.keys(rules).forEach(ruleName => {
				const rule = rules[ruleName];
				node.rules[ruleName] = rule.rule;
				ruleMapperNodeRuleLog('[from: %s(%s)] %s: %o', rule.from, rule.specificity, ruleName, rule.rule);
			});
		});
	}
}
