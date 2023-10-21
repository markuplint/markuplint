import path from 'node:path';

import { glob } from 'glob';
import Mocha from 'mocha';

export async function run() {
	const testFiles = await glob(path.resolve(__dirname, '*.spec.js'));

	const mocha = new Mocha({
		ui: 'tdd',
		color: true,
	});

	for (const file of testFiles) {
		mocha.addFile(file);
	}

	return new Promise<void>(resolve => {
		mocha.run(failures => {
			if (failures > 0) {
				// eslint-disable-next-line unicorn/no-process-exit
				process.exit(1);
			} else {
				resolve();
			}
		});
	});
}
