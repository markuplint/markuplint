export function messageToString(message: string, reason?: string) {
	if (!reason) {
		return message;
	}
	return `${message} / ${reason}`;
}
