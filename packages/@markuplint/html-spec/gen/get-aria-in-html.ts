import readJSON from './read-json';

export function getAriaInHtml(tagName: string) {
	return readJSON(`../src/aria-in-html/${tagName.toLowerCase()}.json`, {
		permittedRoles: {
			roles: true,
		},
		implicitRole: {
			role: false as const,
		},
	});
}
