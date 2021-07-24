type Config = {};
type Result = {};
type Nullable<T> = T | null | undefined;

export function api(targetList: string[], configFilePath?: string, config?: Config): Result[] {
	return targetList.map(targetFilePath => {
		const configFromFile = resolveConfigFromTargetFile(targetFilePath);
		const resolvedConfig = mergeConfig([configFromFile, configFilePath, config]);
		const result = lint(targetFilePath, resolvedConfig);
		return result;
	});
}

function resolveConfigFromTargetFile(targetFilePath: string): Config {
	return {};
}

function mergeConfig(...configs: Nullable<Config>[]) {
	return {};
}

function lint(targetFilePath: string, config: Config): Result {
	return {};
}
