// This file is executed in WebContainer.

// NOTE: Actually, it refers to the installed packages in WebContainer.
import { MLEngine } from 'markuplint';
import { createJsonPayload } from './extract-json.mjs';

main();

function main() {
	const options = getOptions();
	process.stdin.setEncoding('utf8');
	process.stdin.setRawMode(true);
	process.stdin.resume();
	process.stdin.on('data', data => {
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
			const file = await MLEngine.toMLFile(target);
			const engine = new MLEngine(file, { locale: options.locale });
			const result = await engine.exec();
			process.stdout.write(createJsonPayload(result.violations));
		})();
	});

	process.stdout.write('ready');
}

/**
 * Parse command line options.
 * From `node index.mjs --locale ja`
 * to `{ locale: 'ja' }`
 */
function getOptions() {
	const args = process.argv.slice(2);
	const options = {};
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg.startsWith('--')) {
			const key = arg.replace(/^--/, '');
			const value = args[i + 1];
			if (value && !value.startsWith('--')) {
				options[key] = value;
				i++;
			} else {
				options[key] = true;
			}
		}
	}
	return options;
}
