import type { Options } from './types.js';
import type { ARIAVersion } from '@markuplint/ml-spec';

/**
 * Default options shared by the `wai-aria` rule and all `wai-aria-*` sub-rules.
 */
export const defaultOptions: Options = {
	checkingValue: true,
	checkingDeprecatedRole: true,
	checkingDeprecatedProps: true,
	permittedAriaRoles: true,
	checkingAllowedAccessibilityChildRoles: true,
	checkingRequiredOwnedElements: true,
	checkingRequiredAccessibilityParentRole: true,
	checkingTabRequiresTabpanel: true,
	checkingPresentationalChildren: false,
	checkingInteractionInHidden: false,
	disallowSetImplicitRole: true,
	disallowSetImplicitProps: true,
	disallowDefaultValue: false,
	version: undefined as ARIAVersion | undefined,
};
