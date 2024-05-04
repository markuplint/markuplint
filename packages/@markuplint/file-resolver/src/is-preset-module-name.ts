export function isPresetModuleName(name: string) {
	return /^markuplint:/i.test(name);
}
