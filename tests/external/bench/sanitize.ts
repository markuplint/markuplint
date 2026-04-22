/**
 * Strip stack traces and surrounding whitespace from an error-style message.
 *
 * Internal markuplint errors embed a JS stack trace that includes absolute
 * file paths. Keeping only the first line makes snapshots reproducible
 * across machines.
 */
export function sanitizeMessage(message: string): string {
	return (message.split('\n')[0] ?? message).trim();
}
