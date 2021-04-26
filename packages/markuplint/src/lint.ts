import { MLOptions, MLResultInfo } from './types';
import { lintFile, lintFileSync } from './lint-file';
import { resolveConfigs, resolveConfigsSync } from './resolve-configs';
import { resolveLintTargetFiles, resolveLintTargetFilesSync } from './resolve-lint-target-files';
import { resolveRules, resolveRulesSync } from './resolve-rules';

export async function lint(options: MLOptions) {
	const rulesAutoResolve = options.rulesAutoResolve ?? true;

	const files = await resolveLintTargetFiles(options);
	const configs = await resolveConfigs(files, options);
	const rules = await resolveRules(options);

	const totalResults: MLResultInfo[] = [];

	for (const file of files) {
		const result = await lintFile(file, configs, rulesAutoResolve, rules, options.locale, options.fix);
		totalResults.push(result);
	}

	return totalResults;
}

export function lintSync(options: MLOptions) {
	const rulesAutoResolve = options.rulesAutoResolve ?? true;

	const files = resolveLintTargetFilesSync(options);
	const configs = resolveConfigsSync(files, options);
	const rules = resolveRulesSync(options);

	const totalResults: MLResultInfo[] = [];

	for (const file of files) {
		const result = lintFileSync(file, configs, rulesAutoResolve, rules, options.locale, options.fix);
		totalResults.push(result);
	}

	return totalResults;
}
