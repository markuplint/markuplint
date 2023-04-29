const { MLFile } = require('../../lib/ml-file/ml-file');

it('file path', () => {
	const file = new MLFile('/dir/file');
	expect(file.nPath).toBe('/dir/file');
	expect(file.nDirname).toBe('/dir');

	const file2 = new MLFile('/dir/dir2/file.html');
	expect(file2.nPath).toBe('/dir/dir2/file.html');
	expect(file2.nDirname).toBe('/dir/dir2');
});

it('file matches', () => {
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

it('file exists', async () => {
	const file = new MLFile({ sourceCode: '<html></html>' });
	expect(await file.isExist()).toBeTruthy();
});
