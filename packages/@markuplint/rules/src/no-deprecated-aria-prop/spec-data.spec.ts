import { ariaSpecs, createTestDocument } from '@markuplint/ml-core';
import { test, expect } from 'vitest';

test('no ARIA property is deprecated on every role that owns it, so an element whose role is not known is not judged', () => {
	const { specs } = createTestDocument('<div></div>');
	const deprecatedOnEveryRole: string[] = [];
	for (const version of ['1.1', '1.2', '1.3'] as const) {
		const owners = new Map<string, boolean[]>();
		for (const role of ariaSpecs(specs, version).roles.filter(r => !r.isAbstract)) {
			for (const prop of role.ownedProperties ?? []) {
				owners.set(prop.name, [...(owners.get(prop.name) ?? []), prop.deprecated === true]);
			}
		}
		deprecatedOnEveryRole.push(
			...[...owners].filter(([, deprecated]) => deprecated.every(Boolean)).map(([name]) => `${version} ${name}`),
		);
	}
	expect(deprecatedOnEveryRole).toStrictEqual([]);
});
