import type { ARIAVersion } from '@markuplint/ml-spec';

/**
 * Configuration options for the `wai-aria` rule.
 *
 * Each boolean flag enables or disables a specific WAI-ARIA validation check.
 * The `version` field determines which ARIA specification version to validate against.
 */
export type Options = {
	/** Whether to validate ARIA property and state values against their expected types. */
	checkingValue: boolean;
	/** Whether to report usage of deprecated ARIA properties and states. */
	checkingDeprecatedProps: boolean;
	/** Whether to report usage of deprecated ARIA roles. */
	checkingDeprecatedRole: boolean;
	/** Whether to enforce the list of permitted ARIA roles for each element. */
	permittedAriaRoles: boolean;
	/** Whether to verify "Allowed Accessibility Child Roles" (ARIA 1.3 name). */
	checkingAllowedAccessibilityChildRoles: boolean;
	/**
	 * @deprecated Use `checkingAllowedAccessibilityChildRoles` instead.
	 * Retained for backward compatibility.
	 */
	checkingRequiredOwnedElements: boolean;
	/** Whether to verify "Required Accessibility Parent Role" (ARIA 1.3 name) / "Required Context Role" (ARIA 1.2 name). */
	checkingRequiredAccessibilityParentRole: boolean;
	/** Whether to verify that an active `tab` role has a corresponding `tabpanel` role. */
	checkingTabRequiresTabpanel: boolean;
	/** Whether to warn when ARIA attributes are set on descendants of presentational-children roles. */
	checkingPresentationalChildren: boolean;
	/** Whether to warn about focusable interactive elements hidden via `aria-hidden`. */
	checkingInteractionInHidden: boolean;
	/** Whether to disallow explicitly setting a role that matches the element's implicit role. */
	disallowSetImplicitRole: boolean;
	/** Whether to disallow explicitly setting ARIA properties that duplicate the element's native semantics. */
	disallowSetImplicitProps: boolean;
	/** Whether to disallow explicitly setting an ARIA property to its default value. */
	disallowDefaultValue: boolean;
	/** The WAI-ARIA specification version to validate against. */
	version?: ARIAVersion;
};
