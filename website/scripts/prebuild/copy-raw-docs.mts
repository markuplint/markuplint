import { copyFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';

import { projectRoot } from './utils.mjs';

/**
 * Copy Raw Markdown documents to `/docs`
 */
export async function copyRawDocs() {
	await copyFile(
		resolve(projectRoot, 'CONTRIBUTING.md'),
		resolve(projectRoot, 'website', 'community', 'contributing.md'),
	);

	await copyFile(
		resolve(projectRoot, 'CODE_OF_CONDUCT.md'),
		resolve(projectRoot, 'website', 'community', 'code-of-conduct.md'),
	);

	await copyMigrationDocs();
}

/**
 * Copy migration documents from `docs/migration/` to website docs and i18n directories
 */
async function copyMigrationDocs() {
	const srcDir = resolve(projectRoot, 'docs', 'migration', 'v4-v5');
	const enDestDir = resolve(projectRoot, 'website', 'docs', 'migration', 'v4-to-v5');
	const jaDestDir = resolve(
		projectRoot,
		'website',
		'i18n',
		'ja',
		'docusaurus-plugin-content-docs',
		'current',
		'migration',
		'v4-to-v5',
	);

	await copyMigrationDir(srcDir, enDestDir, jaDestDir);
}

async function copyMigrationDir(srcDir: string, enDestDir: string, jaDestDir: string) {
	await mkdir(enDestDir, { recursive: true });
	await mkdir(jaDestDir, { recursive: true });

	const entries = await readdir(srcDir);

	for (const entry of entries) {
		const srcPath = resolve(srcDir, entry);
		const s = await stat(srcPath);

		if (s.isDirectory()) {
			await copyMigrationDir(srcPath, resolve(enDestDir, entry), resolve(jaDestDir, entry));
			continue;
		}

		const name = basename(entry);

		if (name === '.gitkeep') {
			continue;
		}

		if (name.endsWith('.ja.md')) {
			// Japanese: rename .ja.md → .md and rewrite internal .ja.md links
			const enName = name.replace(/\.ja\.md$/, '.md');
			const destPath = resolve(jaDestDir, enName);
			let content = await readFile(srcPath, 'utf8');
			content = content.replaceAll('.ja.md)', '.md)');
			await writeFile(destPath, content, 'utf8');
			console.log(`✔ ${destPath}`);
		} else if (name.endsWith('.md')) {
			// English
			await copyFile(srcPath, resolve(enDestDir, name));
			console.log(`✔ ${resolve(enDestDir, name)}`);
		}
	}
}
