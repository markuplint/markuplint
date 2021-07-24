import { ConfigSet, MLFile, loadConfigFile, recursiveLoad, searchConfigFile } from '@markuplint/file-resolver';
import { Config } from '@markuplint/ml-config';

export async function resolveConfigs(
	files: MLFile[],
	options: {
		config?: string | Config;
		workspace?: string;
		defaultConfig?: Config;
	},
) {
	const workspace = options.workspace ?? process.cwd();

	const configs = new Map<MLFile, ConfigSet>();
	if (options.config) {
		let configSet: ConfigSet | void;
		if (typeof options.config === 'string') {
			configSet = await loadConfigFile(options.config);
		} else {
			const filePath = `${workspace}/__NO_FILE__`;
			const _files = new Set([filePath]);
			configSet = await recursiveLoad(options.config, filePath, _files, true);
		}
		if (configSet) {
			for (const file of files) {
				configs.set(file, configSet);
			}
		}
	} else {
		let configSetNearbyCWD: ConfigSet | void;
		for (const file of files) {
			const configSet = await searchConfigFile(file.path);
			if (configSet) {
				configs.set(file, configSet);
				continue;
			}
			if (!configSetNearbyCWD) {
				configSetNearbyCWD = await searchConfigFile(workspace);
			}
			if (configSetNearbyCWD) {
				configs.set(file, configSetNearbyCWD);
			} else if (options.defaultConfig) {
				configs.set(file, {
					files: new Set([`${workspace}/__DEFAULT_SET__`]),
					config: options.defaultConfig,
					errs: [],
				});
			}
		}
	}

	return configs;
}
