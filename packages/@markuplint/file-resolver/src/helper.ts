import { Config, ConfigSet, loadConfigFile } from './';
import cosmiconfig from 'cosmiconfig';
import path from 'path';

const explorer = cosmiconfig('markuplint');

export async function search<T = cosmiconfig.Config>(dir: string, cacheClear: boolean) {
	if (!cacheClear) {
		explorer.clearCaches();
	}
	const result = await explorer.search(dir);
	if (!result || result.isEmpty) {
		return null;
	}
	return {
		filePath: result.filepath,
		config: result.config as T,
	};
}

export async function load<T = cosmiconfig.Config>(filePath: string, cacheClear: boolean) {
	if (!cacheClear) {
		explorer.clearCaches();
	}
	const result = await explorer.load(filePath);
	if (!result || result.isEmpty) {
		return null;
	}
	return {
		filePath: result.filepath,
		config: result.config as T,
	};
}

export async function recursiveLoad(
	config: Config,
	filePath: string,
	files: Set<string>,
	cacheClear: boolean,
): Promise<ConfigSet> {
	const errs: Error[] = [];
	const baseDir = path.dirname(filePath);
	if (config.extends) {
		const extendFiles = Array.isArray(config.extends) ? config.extends : [config.extends];
		for (const _file of extendFiles) {
			if (/^\.+\//.test(_file)) {
				const file = path.resolve(path.join(baseDir, _file));
				if (files.has(file)) {
					continue;
				}
				const extendFileResult = await loadConfigFile(file, true, cacheClear);
				if (!extendFileResult) {
					continue;
				}
				files = new Set(files).add(file);
				config = margeConfig(config, extendFileResult.config);
			} else {
				try {
					const mod: Config = await import(_file);
					// @ts-ignore
					delete mod.default;
					files.add(_file);
					config = margeConfig(config, mod);
				} catch (err) {
					errs.push(err);
				}
			}
		}
	}
	delete config.extends;
	return {
		files,
		config,
		errs,
	};
}

function margeConfig(a: Config, b: Config): Config {
	return {
		...a,
		...b,
		rules: {
			...a.rules,
			...b.rules,
		},
		nodeRules: [...(a.nodeRules || []), ...(b.nodeRules || [])],
		childNodeRules: [...(a.childNodeRules || []), ...(b.childNodeRules || [])],
	};
}
