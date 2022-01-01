export type CreateRuleHelperParams = CreateRuleCreatorParams & {
	purpose: CreateRulePurpose;
};

export type CreateRuleCreatorParams = {
	name: string;
	lang: CreateRuleLanguage;
	needTest: boolean;
};

export type CreateRuleHelperResult = CreateRuleCreatorParams & {
	readme: string;
	main: string;
	test: string | null;
	packageJson: string | null;
	tsConfig: string | null;
	dependencies: string[];
	devDependencies: string[];
};

export type CreateRuleLanguage = 'JAVASCRIPT' | 'TYPESCRIPT';

export type CreateRulePurpose = 'ADD_TO_PROJECT' | 'PUBLISH_AS_PACKAGE' | 'CONTRIBUTE_TO_CORE';
