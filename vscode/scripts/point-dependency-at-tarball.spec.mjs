import { describe, expect, test } from 'vitest';

import { pointDependencyAtTarball } from './point-dependency-at-tarball.mjs';

const DEPENDENCIES = { '@markuplint/language-server': '5.0.1', glob: '13.0.6' };

const manifest = dependencies =>
	JSON.stringify({ name: 'markuplint-vscode', version: '5.0.1', dependencies }, null, '\t') + '\n';

describe('pointDependencyAtTarball', () => {
	test('replaces the version of the dependency with the tarball', () => {
		const result = JSON.parse(
			pointDependencyAtTarball(
				manifest(DEPENDENCIES),
				'@markuplint/language-server',
				'/tmp/pack/language-server-5.0.1.tgz',
			),
		);
		expect(result.dependencies['@markuplint/language-server']).toBe('file:/tmp/pack/language-server-5.0.1.tgz');
	});

	test('leaves the other dependencies and fields as they are', () => {
		const result = JSON.parse(
			pointDependencyAtTarball(
				manifest(DEPENDENCIES),
				'@markuplint/language-server',
				'/tmp/pack/language-server-5.0.1.tgz',
			),
		);
		expect(result).toStrictEqual({
			name: 'markuplint-vscode',
			version: '5.0.1',
			dependencies: {
				'@markuplint/language-server': 'file:/tmp/pack/language-server-5.0.1.tgz',
				glob: '13.0.6',
			},
		});
	});

	test('keeps the tab indentation and the trailing newline of the manifest', () => {
		const result = pointDependencyAtTarball(manifest(DEPENDENCIES), '@markuplint/language-server', '/tmp/a.tgz');
		expect(result).toBe(
			'{\n\t"name": "markuplint-vscode",\n\t"version": "5.0.1",\n\t"dependencies": {\n\t\t"@markuplint/language-server": "file:/tmp/a.tgz",\n\t\t"glob": "13.0.6"\n\t}\n}\n',
		);
	});

	test('writes a Windows path with forward slashes', () => {
		const result = JSON.parse(
			pointDependencyAtTarball(
				manifest(DEPENDENCIES),
				'@markuplint/language-server',
				'C:\\Users\\runner\\pack\\a.tgz',
			),
		);
		expect(result.dependencies['@markuplint/language-server']).toBe('file:C:/Users/runner/pack/a.tgz');
	});

	test('throws when the package does not depend on it, instead of doing nothing', () => {
		expect(() =>
			pointDependencyAtTarball(manifest({ glob: '13.0.6' }), '@markuplint/language-server', '/tmp/a.tgz'),
		).toThrow('@markuplint/language-server is not a dependency');
	});

	test('throws when the manifest has no dependencies', () => {
		expect(() => pointDependencyAtTarball('{"name":"x"}', '@markuplint/language-server', '/tmp/a.tgz')).toThrow(
			'@markuplint/language-server is not a dependency',
		);
	});
});
