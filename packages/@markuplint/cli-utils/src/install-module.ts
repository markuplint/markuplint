import { spawnSync } from 'node:child_process';

import c from 'picocolors';
// @ts-ignore
import detectInstalled from 'detect-installed';
import hasYarn from 'has-yarn';

export type InstallModuleResult = {
	success: boolean;
	alreadyExists: boolean;
};

export async function installModule(module: readonly string[], dev = false): Promise<InstallModuleResult> {
	module = module.map(m => m.trim());
	const uninstallMods: string[] = [];
	try {
		for (const mod of module) {
			const installed = await isInstalled(mod);
			if (!installed) {
				uninstallMods.push(mod);
			}
		}
	} catch {
		// void
	}

	if (uninstallMods.length === 0) {
		return {
			success: true,
			alreadyExists: true,
		};
	}

	const mod = hasYarn() ? 'yarn' : 'npm';
	const installOpt = hasYarn() ? 'add' : 'install';
	const opt = [installOpt];
	if (dev) {
		opt.push('-D');
	}
	if (!hasYarn()) {
		opt.push('--legacy-peer-deps');
	}

	opt.push(...uninstallMods);

	return new Promise<InstallModuleResult>((resolve, reject) => {
		process.stdout.write(c.blackBright(`${mod} ${opt.join(' ')}\n`));
		const result = spawnSync(mod, opt, { stdio: 'inherit' });

		if (result.error || result.status !== 0) {
			const message = 'Error running command.';
			const error = new Error(message);
			error.stack = message;
			reject(error);
		}

		resolve({
			success: true,
			alreadyExists: false,
		});
	});
}

function isInstalled(module: string) {
	return new Promise<boolean>((resolve, reject) => {
		try {
			detectInstalled(module, {
				local: true,
			}).then((exists: boolean) => {
				resolve(exists);
			});
		} catch (error) {
			reject(error);
		}
	});
}
