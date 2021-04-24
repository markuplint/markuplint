import { AnonymousNode, Element, Result, RuleConfigValue, SyncWalker } from '@markuplint/ml-core';
import { Translator } from '@markuplint/i18n';

export type VerifyWalkerFactory<T extends RuleConfigValue, O = null, N = AnonymousNode<T, O>, R = unknown> = (
	reports: Result[],
	translate: Translator,
	...rest: R extends any[] ? R : R[]
) => SyncWalker<T, O, N>;

export type FixWalker<T extends RuleConfigValue = null, O = null, N = AnonymousNode<T, O>> = SyncWalker<T, O, N>;

export type ElementVerifyWalkerFactory<T extends RuleConfigValue = null, O = null, R = unknown> = VerifyWalkerFactory<
	T,
	O,
	Element<T, O>,
	R
>;

export type ElementFixWalker<T extends RuleConfigValue = null, O = null> = SyncWalker<T, O, Element<T, O>>;
