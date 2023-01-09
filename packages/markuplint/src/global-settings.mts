let globalSettings: Partial<GlobalSettings> = {};

export type GlobalSettings = {
	locale: string;
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
