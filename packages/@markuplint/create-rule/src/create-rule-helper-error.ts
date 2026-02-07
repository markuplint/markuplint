/**
 * Custom error class for failures that occur during rule scaffolding.
 * Thrown when preconditions are not met (e.g., directory already exists,
 * core options missing, or repository not found).
 */
export class CreateRuleHelperError extends Error {
	name = 'CreateRuleHelperError';
}
