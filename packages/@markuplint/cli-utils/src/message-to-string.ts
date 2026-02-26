/**
 * Combines a lint violation message with an optional specConformance tag
 * and reason string.
 *
 * @param message - The primary violation message
 * @param specConformance - An optional conformance level (e.g. "normative")
 * @param reason - An optional supplementary reason or detail to append
 * @returns The combined message string
 */
export function messageToString(message: string, specConformance?: string, reason?: string) {
	let result = message;
	if (specConformance) {
		result += ` [${specConformance}]`;
	}
	if (reason) {
		result += ` / ${reason}`;
	}
	return result;
}
