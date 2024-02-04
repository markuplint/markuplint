export type CreateRuleHelperParams = CreateRuleCreatorParams & {
	readonly purpose: CreateRulePurpose;
};

export type CreateRuleCreatorParams = {
	readonly pluginName: string;
	readonly ruleName: string;
	readonly lang: CreateRuleLanguage;
	readonly needTest: boolean;
	readonly core?: CreateRuleCreatorCoreParams;
};

export type CreateRuleCreatorCoreParams = {
	readonly description: string;
	readonly category: string;
	readonly severity: string;
};

export type CreateRuleHelperResult = {
	readonly files: readonly File[];
	readonly dependencies: readonly string[];
	readonly devDependencies: readonly string[];
};

export type CreateRuleLanguage = 'JAVASCRIPT' | 'TYPESCRIPT';

export type CreateRulePurpose = 'ADD_TO_PROJECT' | 'PUBLISH_AS_PACKAGE' | 'CONTRIBUTE_TO_CORE';

export type File = {
	readonly ext: string;
	readonly name: string;
	readonly fileName: string;
	readonly test: boolean;
	readonly destDir: string;
	readonly filePath: string;
};
