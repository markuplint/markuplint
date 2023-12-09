import fs from 'node:fs';
import path from 'node:path';

/**
 *
 * @param {string} filePath
 * @param {string} newExtension
 */
function renameFileExtension(filePath, newExtension) {
	const dir = path.dirname(filePath);
	const fileName = path.basename(filePath, path.extname(filePath)) + newExtension;
	const newFilePath = path.join(dir, fileName);
	fs.renameSync(filePath, newFilePath);
	return newFilePath;
}

function replaceInFile(filePath, searchValue, replaceValue) {
	const data = fs.readFileSync(filePath, 'utf8');
	const result = data.replace(searchValue, replaceValue);
	fs.writeFileSync(filePath, result, 'utf8');
}

/**
 *
 * @param {string} dir
 */
function processDirectory(dir) {
	const files = fs.readdirSync(dir, { withFileTypes: true });
	for (const file of files) {
		const fullPath = path.join(dir, file.name);
		if (file.isDirectory()) {
			processDirectory(fullPath);
		} else {
			if (file.name.endsWith('.js')) {
				const newFilePath = renameFileExtension(fullPath, '.mjs');
				replaceInFile(newFilePath, /\.js/g, '.mjs');
			}
		}
	}
}

processDirectory('./esm');
