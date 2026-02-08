let globalSettings: Partial<GlobalSettings> = {};

/**
 * Shape of the global settings that apply across all markuplint operations.
 */
export type GlobalSettings = {
	readonly locale: string;
};

/**
 * Merges the provided settings into the current global settings.
 *
 * Settings are shallowly merged, so only the specified keys are overwritten.
 *
 * @param settings - A partial set of global settings to apply.
 */
export function setGlobal(settings: Partial<GlobalSettings>) {
	globalSettings = {
		...globalSettings,
		...settings,
	};
}

/**
 * Returns the current global settings as a read-only object.
 *
 * @returns The current global settings.
 */
export function getGlobal(): Readonly<Partial<GlobalSettings>> {
	return globalSettings;
}
