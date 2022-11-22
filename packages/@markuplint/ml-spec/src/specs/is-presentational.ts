export function isPresentational(roleName?: string) {
	if (!roleName) {
		return false;
	}
	return ['presentation', 'none'].includes(roleName);
}
