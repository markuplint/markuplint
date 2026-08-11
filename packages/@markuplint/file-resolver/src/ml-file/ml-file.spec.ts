import { test, expect } from 'vitest';

import { MLFile } from './ml-file.js';

test('file path', () => {
	const file = new MLFile('/dir/file');
	expect(file.nPath).toBe('/dir/file');
	expect(file.nDirname).toBe('/dir');

	const file2 = new MLFile('/dir/dir2/file.html');
	expect(file2.nPath).toBe('/dir/dir2/file.html');
	expect(file2.nDirname).toBe('/dir/dir2');
});

test('file matches', () => {
	const file = new MLFile('/dir/file');
	expect(file.matches('/dir/*')).toBeTruthy();
	expect(file.matches('/**/*')).toBeTruthy();
	expect(file.matches('/dir2/*')).toBeFalsy();

	const file2 = new MLFile('/dir/dir2/file.html');
	expect(file2.matches('/dir/*')).toBeFalsy();
	expect(file2.matches('/**/*')).toBeTruthy();
	expect(file2.matches('/dir2/*')).toBeFalsy();
	expect(file2.matches('/dir/**/*')).toBeTruthy();
	expect(file2.matches('/dir/**/*.html')).toBeTruthy();
	expect(file2.matches('/dir/**/*.css')).toBeFalsy();
	expect(file2.matches('/dir/**/*.{html,css}')).toBeTruthy();
});

test('ignored', () => {
	const file = new MLFile('/dir/file');
	expect(file.ignored(['*'])).toBeTruthy();
	expect(file.ignored(['dir'])).toBeTruthy();
	expect(file.ignored(['dir/file'])).toBeTruthy();
	expect(file.ignored(['!dir/file'])).toBeFalsy();

	// It can't cancel because its parent is ignored.
	expect(file.ignored(['*', '!dir/file'])).toBeTruthy();

	// It can cancel because its parent is canceled.
	expect(file.ignored(['*', '!dir', 'dir/*', '!dir/file'])).toBeFalsy();
});

test('ignored with absolute path patterns', () => {
	const file = new MLFile('/project/src/file.html');
	// gitignore-style: pattern must match from the root of the relative path
	expect(file.ignored(['project/src/file.html'])).toBeTruthy();
	expect(file.ignored(['project'])).toBeTruthy();
	expect(file.ignored(['**/file.html'])).toBeTruthy();
	expect(file.ignored(['!project/src/file.html'])).toBeFalsy();
});

test('file exists', async () => {
	const file = new MLFile({ sourceCode: '<html></html>' });
	expect(await file.isExist()).toBeTruthy();
});

test('code-base file with a subdirectory-relative name resolves against workspace', () => {
	// A relative `name` that includes subdirectories (e.g. from a VS Code document
	// opened below the workspace root) must resolve to the file's actual location,
	// not collapse to the workspace root + basename.
	const file = new MLFile({ sourceCode: '<div></div>', name: 'src/components/Button.tsx', workspace: '/project' });
	expect(file.path).toBe('/project/src/components/Button.tsx');
	expect(file.dirname).toBe('/project');
});
