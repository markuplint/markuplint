import c from 'cli-color';
// @ts-ignore
import detectInstalled from 'detect-installed';
import hasYarn from 'has-yarn';
import { spawnSync } from 'child_process';

export type InstallModuleResult = {
	success: boolean;
	alreadyExists: boolean;
};

export async function installModule(module: string[], dev = false): Promise<InstallModuleResult> {
	module = module.map(m => m.trim());
	const uninstallMods: string[] = [];
	try {
		for (const mod of module) {
			const installed = await isInstalled(mod);
			if (!installed) {
				uninstallMods.push(mod);
			}
		}
	} catch (_) {
		// void
	}

	if (!uninstallMods.length) {
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

async function isInstalled(module: string) {
	return new Promise<boolean>((resolve, reject) => {
		try {
			detectInstalled(module, {
				local: true,
			}).then((exists: boolean) => {
				resolve(exists);
			});
		} catch (err) {
			reject(err);
		}
	});
}
