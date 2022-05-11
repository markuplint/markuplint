import type { Specificity } from '../../selector/selector';
import type { MLDocument } from './document';
import type { MLNode } from './node';
import type { AnyRule } from '@markuplint/ml-config';

import { log as coreLog } from '../../debug';
import { compareSpecificity } from '../../selector/selector';

const ruleMapperLog = coreLog.extend('rule-mapper');
const ruleMapperNodeLog = ruleMapperLog.extend('node');
const ruleMapperNodeRuleLog = ruleMapperNodeLog.extend('rule');

type RuleType = 'rules' | 'nodeRules' | 'childNodeRules';

type MappingLayer = {
	from: RuleType;
	specificity: Specificity;
	rule: AnyRule;
};

export class RuleMapper {
	#nodeList: ReadonlyArray<MLNode<any, any>>;
	#ruleMap = new Map<string, Record<string, MappingLayer>>();

	constructor(document: MLDocument<any, any>) {
		this.#nodeList = Object.freeze([document, ...document.nodeList]);
	}

	apply() {
		ruleMapperLog('ruleTree:');

		this.#nodeList.forEach(node => {
			const rules = this.#ruleMap.get(node.uuid);
			if (!rules) {
				return;
			}
			ruleMapperNodeLog('<%s>', node.nodeName);
			Object.keys(rules).forEach(ruleName => {
				const rule = rules[ruleName];
				node.rules[ruleName] = rule.rule;
				ruleMapperNodeRuleLog('[from: %s(%s)] %s: %o', rule.from, rule.specificity, ruleName, rule.rule);
			});
		});
	}

	set(node: MLNode<any, any>, ruleName: string, rule: MappingLayer) {
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
		ruleMapperLog('Set to %s from %s (%o): %O', node.nodeName, rule.from, rule.specificity, rule.rule);
	}
}
