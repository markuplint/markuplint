type PlaygroundValues = Readonly<{
	code: string;
	codeFilename: string;
	config: string;
	configFilename: string;
	deps: string;
}>;

const encode = (values: PlaygroundValues): string => {
	return window.btoa(encodeURIComponent(JSON.stringify(values)));
};
const decode = (string: string): Partial<PlaygroundValues> => {
	const decoded = decodeURIComponent(window.atob(string));

	try {
		const parsed = JSON.parse(decoded);
		return typeof parsed === 'object' && parsed !== null ? parsed : {};
	} catch (e) {
		return {};
	}
};

export const saveValues = (values: PlaygroundValues) => {
	location.hash = encode(values);
};
export const loadValues = (): Partial<PlaygroundValues> | null => {
	return location.hash ? decode(location.hash.slice(1)) : null;
};
