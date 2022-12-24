export type CreateRuleHelperParams = CreateRuleCreatorParams & {
	purpose: CreateRulePurpose;
};

export type CreateRuleCreatorParams = {
	pluginName: string;
	ruleName: string;
	lang: CreateRuleLanguage;
	needTest: boolean;
	core?: CreateRuleCreatorCoreParams;
};

export type CreateRuleCreatorCoreParams = {
	description: string;
	category: string;
	severity: string;
};

export type CreateRuleHelperResult = {
	files: File[];
	dependencies: string[];
	devDependencies: string[];
};

export type CreateRuleLanguage = 'JAVASCRIPT' | 'TYPESCRIPT';

export type CreateRulePurpose = 'ADD_TO_PROJECT' | 'PUBLISH_AS_PACKAGE' | 'CONTRIBUTE_TO_CORE';

export type File = {
	ext: string;
	name: string;
	fileName: string;
	test: boolean;
	destDir: string;
	filePath: string;
};
