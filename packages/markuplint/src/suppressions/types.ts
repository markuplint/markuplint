/**
 * @experimental
 * A single suppression entry representing the count of suppressed violations
 * for a specific rule in a specific file.
 */
export type SuppressionEntry = {
	readonly count: number;
	/**
	 * @experimental
	 * CSS selector identifying the LCA (Lowest Common Ancestor) subtree
	 * that contains all violations for this rule. Uses id/class/attr for
	 * precise matching. When absent, suppression applies to the entire file.
	 */
	readonly scope?: string;
};

/**
 * @experimental
 * The full suppressions data structure.
 * Top-level keys are relative file paths, values are maps of ruleId to suppression entry.
 *
 * **Format note:** The flat structure `{ filePath: { ruleId: { count, scope? } } }`
 * has no version envelope. The `scope` field is additive (Phase 2) — existing files
 * without `scope` remain compatible as file-level suppressions. Should a breaking
 * format change ever be needed, introduce a `{ version: N, ... }` wrapper and migrate.
 */
export type SuppressionsData = Record<string, Record<string, SuppressionEntry>>;
