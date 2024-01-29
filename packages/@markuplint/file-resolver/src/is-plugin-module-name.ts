export function isPluginModuleName(name: string) {
	return /^plugin:/i.test(name);
}
