/**
 * Combines a lint violation message with an optional reason string.
 * When a reason is provided, it is appended after a " / " separator.
 *
 * @param message - The primary violation message
 * @param reason - An optional supplementary reason or detail to append
 * @returns The combined message string
 */
export function messageToString(message: string, reason?: string) {
	if (!reason) {
		return message;
	}
	return `${message} / ${reason}`;
}
