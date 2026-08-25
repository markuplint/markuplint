import type { MLRuleContext } from './ml-rule-context.js';
import type { Attr, Element } from '../ml-dom/index.js';
import type { Translator } from '@markuplint/i18n';
import type { MLASTParseErrorCode } from '@markuplint/ml-ast';
import type { PlainData, Report, RuleConfigValue, Severity } from '@markuplint/ml-config';

/**
 * The specification, standard, or guidance document a rule's check derives from.
 * A rule may cite more than one (e.g. a check spanning HTML LS and WAI-ARIA).
 *
 * - `'html'` — WHATWG HTML Living Standard
 * - `'wai-aria'` — W3C WAI-ARIA
 * - `'aria-in-html'` — W3C ARIA in HTML
 * - `'dpub-aria'` — W3C Digital Publishing WAI-ARIA Module
 * - `'graphics-aria'` — W3C Graphics ARIA
 * - `'accname'` — W3C Accessible Name and Description Computation
 * - `'apg'` — W3C ARIA Authoring Practices Guide (non-normative)
 * - `'wcag'` — W3C Web Content Accessibility Guidelines (success criteria or
 *   non-normative techniques — see {@link RuleConformanceLevel})
 * - `'bcd'` — MDN `browser-compat-data` (a factual dataset, not a specification)
 * - `'none'` — no spec basis; a tool-defined or user-configurable check
 */
export type RuleConformanceSource =
	| 'html'
	| 'wai-aria'
	| 'aria-in-html'
	| 'dpub-aria'
	| 'graphics-aria'
	| 'accname'
	| 'apg'
	| 'wcag'
	| 'bcd'
	| 'none';

/**
 * How strongly a rule's check is backed by its {@link RuleConformanceSource}s.
 * This is the basis {@link deriveDefaultSeverityFromConformanceLevel} uses to
 * derive the policy default severity — see that function for the mapping.
 *
 * - `'must'` — a normative MUST/MUST NOT (including HTML parse errors, and a
 *   WCAG success criterion violation)
 * - `'should'` — a normative SHOULD/SHOULD NOT
 * - `'non-normative'` — a spec Note, an APG practice, or a WCAG technique
 * - `'factual'` — checked against factual data (e.g. `bcd`) rather than a
 *   conformance requirement
 * - `'opinion'` — the spec permits the pattern; the rule enforces a tool or
 *   team preference
 * - `'configurable'` — a user-defined constraint with no spec basis; the rule
 *   is a mechanism the user configures, not a fixed check
 */
export type RuleConformanceLevel = 'must' | 'should' | 'non-normative' | 'factual' | 'opinion' | 'configurable';

/**
 * A citation for a rule's {@link RuleConformance}: either a bare spec URL, or
 * a WCAG success criterion reference (`sc`/`level`) alongside its URL.
 */
export type RuleConformanceCite =
	| string
	| {
			readonly url: string;
			readonly sc?: string;
			readonly level?: 'A' | 'AA' | 'AAA';
	  };

/**
 * A rule's specification-conformance classification: what it's checking
 * against, how strongly that source requires it, and where to read the
 * requirement. Distinct from `@markuplint/ml-config`'s `SpecConformance`
 * (`'normative' | 'non-normative'`), which is a coarse, optional tag a
 * *user* attaches to their own named nodeRule groups for reporting and never
 * affects severity. This classification is authored by the *rule*, is (in
 * the medium term) mandatory on every built-in rule, and is the basis for
 * the rule's default severity and its eligibility for spec-conformance
 * presets such as `markuplint:html-standard`.
 */
export type RuleConformance = {
	readonly sources: readonly RuleConformanceSource[];
	readonly level: RuleConformanceLevel;
	readonly cites: readonly RuleConformanceCite[];
};

/**
 * The policy-derived default `Severity` for each {@link RuleConformanceLevel}.
 * `'configurable'` has no policy value — a rule at that level either omits
 * `defaultSeverity` (falling back to the engine's own `'error'` default,
 * matching `no-restricted-*`-style rules that are inert until configured) or
 * sets one deliberately to fit how it's typically used.
 *
 * @see deriveDefaultSeverityFromConformanceLevel
 */
const CONFORMANCE_LEVEL_DEFAULT_SEVERITY: Readonly<Partial<Record<RuleConformanceLevel, Severity>>> = {
	must: 'error',
	should: 'warning',
	'non-normative': 'warning',
	factual: 'warning',
	opinion: 'warning',
};

/**
 * Derives the policy default `Severity` for a {@link RuleConformanceLevel},
 * or `undefined` for `'configurable'` (no policy applies — see
 * {@link CONFORMANCE_LEVEL_DEFAULT_SEVERITY}).
 *
 * Used by `@markuplint/rules`'s registry test to flag rules whose
 * `defaultSeverity` disagrees with their declared `specConformance.level`
 * without an accompanying `severityRationale`.
 */
export function deriveDefaultSeverityFromConformanceLevel(level: RuleConformanceLevel): Severity | undefined {
	return CONFORMANCE_LEVEL_DEFAULT_SEVERITY[level];
}

/**
 * The definition of a markuplint rule, including verification logic
 * and default configuration values.
 *
 * @template T - The type of the rule's configuration value (defaults to boolean)
 * @template O - The type of the rule's options
 */
export type RuleSeed<T extends RuleConfigValue = boolean, O extends PlainData = undefined> = {
	readonly meta?: {
		readonly category?: 'validation' | 'style' | 'naming-convention' | 'a11y' | 'maintainability';

		/**
		 * This rule's specification-conformance classification. See
		 * {@link RuleConformance}. Intended to become mandatory on every
		 * built-in rule; until the v5 rule-system redesign finishes rolling
		 * it out across `@markuplint/rules`, it remains optional so partially
		 * migrated rules do not fail the build.
		 */
		readonly specConformance?: RuleConformance;

		/**
		 * Explains why this rule's `defaultSeverity` deliberately departs
		 * from the policy value {@link deriveDefaultSeverityFromConformanceLevel}
		 * derives from `meta.specConformance.level`. Required whenever the
		 * two disagree; the `@markuplint/rules` registry test enforces this.
		 */
		readonly severityRationale?: string;

		/**
		 * parse5 `ERR` codes whose detection this rule covers. When the rule is
		 * active in the ruleset, `@markuplint/ml-core`'s built-in `parse-error`
		 * channel skips events whose `code` appears in this list — so the user
		 * does not get duplicate violations for the same underlying parse5
		 * event (one from this rule, one from the parse-error channel).
		 *
		 * Declare a code here only if the rule's detection scope is at least
		 * as broad as the parse5 event (i.e. every situation where parse5
		 * fires the code, the rule reports it too). For rules whose detection
		 * is wider than parse5 (e.g. `no-duplicate-attr` also covers JSX where
		 * parse5 never runs) this still holds because the rule fires first.
		 *
		 * The dedupe is global (the rule is checked at the ruleset level, not
		 * per node), so partial-scope rules like `no-duplicate-attr` (HTML
		 * elements only via parse5; JSX / SVG via the rule itself) are safe:
		 * parse5 only fires on HTML anyway. Note that `nodeRules` entries that
		 * locally disable a mirroring rule do not change this decision.
		 *
		 * A mirroring rule typically produces its own violation by reading
		 * `document.parseErrors`; see the `character-reference` rule in
		 * `@markuplint/rules` for the canonical hook example.
		 */
		readonly mirrorsParseErrorCodes?: readonly MLASTParseErrorCode[];
	};

	readonly defaultSeverity?: Severity;
	readonly defaultValue?: T;
	readonly defaultOptions?: O;
	verify(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		context: ReturnType<MLRuleContext<T, O>['provide']>,
	): void | Promise<void>;
};

/**
 * A generic checker function that produces a violation report from parameters.
 *
 * @template T - The type of the rule's configuration value
 * @template O - The type of the rule's options
 * @template P - Additional parameters passed to the checker
 */
export type Checker<
	T extends RuleConfigValue,
	O extends PlainData = undefined,
	P extends Record<string, unknown> = {},
> = (params: P) => CheckerReport<T, O>;

/**
 * A checker function that verifies a specific element and produces a violation report.
 *
 * @template T - The type of the rule's configuration value
 * @template O - The type of the rule's options
 * @template P - Additional parameters passed alongside the element
 */
export type ElementChecker<
	T extends RuleConfigValue,
	O extends PlainData = undefined,
	P extends Record<string, unknown> = {},
> = (
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	params: P & { el: Element<T, O> },
) => CheckerReport<T, O>;

/**
 * A checker function that verifies a specific attribute and produces a violation report.
 *
 * @template T - The type of the rule's configuration value
 * @template O - The type of the rule's options
 * @template P - Additional parameters passed alongside the attribute
 */
export type AttrChecker<
	T extends RuleConfigValue,
	O extends PlainData = undefined,
	P extends Record<string, unknown> = {},
> = (
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	params: P & { attr: Attr<T, O> },
) => CheckerReport<T, O>;

/**
 * A function that receives a translator and returns a violation report, or `null`/`undefined`
 * if no violation was found.
 *
 * @template T - The type of the rule's configuration value
 * @template O - The type of the rule's options
 */
export type CheckerReport<T extends RuleConfigValue, O extends PlainData = undefined> = (
	t: Translator,
) => Report<T, O> | undefined | null;

/**
 * A RuleSeed with wildcard value and option types.
 *
 * @template T - The type of the rule's configuration value
 * @template O - The type of the rule's options
 */
export type AnyRuleSeed<T extends RuleConfigValue = RuleConfigValue, O extends PlainData = PlainData> = RuleSeed<T, O>;
