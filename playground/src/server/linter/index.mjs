// @ts-check
// This file is executed in WebContainer.

// NOTE: Actually, it refers to the installed packages in WebContainer.
import { MLEngine } from 'markuplint';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const content = fs.readFileSync(path.resolve(__dirname, './constants.json'), { encoding: 'utf-8' });
const constants = JSON.parse(content);

main();

function main() {
	const options = getOptions();
	process.stdin.setEncoding('utf8');
	process.stdin.setRawMode(true);
	process.stdin.resume();
	process.stdin.on('data', (/** @type {string} */ data) => {
		if (
			data === 'ready?' ||
			data.includes('ready?')
			// FIXME: only data === 'ready?' is correct, but it doesn't work. Sometimes data is 'ready?ready?'.
		) {
			process.stdout.write(createJsonPayload('ready'));
			return;
		}
		void (async () => {
			const target = data;
			try {
				const file = await MLEngine.toMLFile(target);
				if (file == null) {
					return;
				}
				const engine = new MLEngine(file, { locale: options.locale });
				const result = await engine.exec();
				if (result === null) {
					process.stdout.write(createJsonPayload(null));
					return;
				} else {
					process.stdout.write(createJsonPayload(result.violations));
				}
			} catch (error) {
				process.stdout.write(createJsonPayload('error'));
				throw error;
			}
		})();
	});
}

/**
 * Parse command line options.
 * From `node index.mjs --locale ja`
 * to `{ locale: 'ja' }`
 */
function getOptions() {
	const args = process.argv.slice(2);
	/** @type {{ locale?: string }} */
	const options = {};
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg.startsWith('--')) {
			const key = arg.replace(/^--/, '');
			const value = args[i + 1];
			if (value && !value.startsWith('--')) {
				if (key === 'locale') {
					options[key] = value;
				}
				i++;
			}
		}
	}
	return options;
}

/**
 * Convert the linter output to distinguish it from other logs.
 */
export function createJsonPayload(/** @type {any} */ payload) {
	const { DIRECTIVE_OPEN, DIRECTIVE_CLOSE } = constants;
	return `${DIRECTIVE_OPEN}${JSON.stringify(payload)}${DIRECTIVE_CLOSE}`;
}
