/**
 * Types of `.commitlintrc.js` for the spec that exercises its rule
 * (`packages/@markuplint/test-tools/src/commitlint-breaking-change.spec.ts`)
 * and for the editor. commitlint itself loads the `.js`; this file exists
 * because the workspace compiles without `allowJs`, so TypeScript cannot
 * resolve an import of the config without it. It is what `tsc` and the editor
 * read for that import, and it has to be kept in step with the `.js` by hand.
 */

/** A note of a parsed commit; the parser makes one for a `!` header and for a `BREAKING CHANGE:` footer. */
export interface CommitNote {
	readonly title: string;
	readonly text: string;
}

/** The part of a parsed commit the rule reads. */
export interface ParsedCommit {
	readonly notes: readonly CommitNote[];
}

/** What a commitlint rule returns: whether the commit passes, and the message when it does not. */
export type RuleOutcome = readonly [valid: boolean, message?: string];

/** The rule reads `parsed` only: the `when` argument commitlint passes is not meaningful for it. */
export function noBreakingChangeOnStableLine(isStableLine: () => boolean): (parsed: ParsedCommit) => RuleOutcome;

declare const config: Readonly<Record<string, unknown>>;
export default config;
