let globalSettings: Partial<GlobalSettings> = {};

export type GlobalSettings = {
	readonly locale: string;
};

export function setGlobal(settings: Partial<GlobalSettings>) {
	globalSettings = {
		...globalSettings,
		...settings,
	};
}

export function getGlobal(): Readonly<Partial<GlobalSettings>> {
	return globalSettings;
}
