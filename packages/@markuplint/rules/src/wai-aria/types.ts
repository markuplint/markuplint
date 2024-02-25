import type { ARIAVersion } from '@markuplint/ml-spec';

export type Options = {
	checkingValue: boolean;
	checkingDeprecatedProps: boolean;
	checkingDeprecatedRole: boolean;
	permittedAriaRoles: boolean;
	checkingRequiredOwnedElements: boolean;
	checkingPresentationalChildren: boolean;
	checkingInteractionInHidden: boolean;
	disallowSetImplicitRole: boolean;
	disallowSetImplicitProps: boolean;
	disallowDefaultValue: boolean;
	version: ARIAVersion;
};
