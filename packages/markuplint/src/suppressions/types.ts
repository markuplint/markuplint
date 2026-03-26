/**
 * @experimental
 * A single suppression entry representing the count of suppressed violations
 * for a specific rule in a specific file.
 */
export type SuppressionEntry = {
	readonly count: number;
};

/**
 * @experimental
 * The full suppressions data structure.
 * Top-level keys are relative file paths, values are maps of ruleId to suppression entry.
 *
 * **Format note (Phase 1):** The current flat structure `{ filePath: { ruleId: { count } } }`
 * has no version envelope. If Phase 2 adds a `scope` field to entries, existing files
 * remain compatible (new fields are additive). Should a breaking format change ever be
 * needed, introduce a `{ version: N, suppressions: { ... } }` wrapper and migrate.
 */
export type SuppressionsData = Record<string, Record<string, SuppressionEntry>>;
