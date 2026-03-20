/**
 * Thrown when an internal API is called in a way that violates its
 * contract (Tier 1 — Fatal). Indicates a bug in markuplint itself.
 */
export class UnexpectedCallError extends Error {}
