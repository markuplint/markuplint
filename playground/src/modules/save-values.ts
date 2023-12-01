export const fileTypes = ['.html', '.jsx', '.vue', '.svelte'] as const;

export type PlaygroundValues = Readonly<{
	code: string;
	codeFileType: string;
	config: string;
}>;

const encode = (values: PlaygroundValues): string => {
	return window.btoa(encodeURIComponent(JSON.stringify(values)));
};
const decode = (string: string): Partial<PlaygroundValues> => {
	const decoded = decodeURIComponent(window.atob(string));

	try {
		const parsed = JSON.parse(decoded);
		return typeof parsed === 'object' && parsed !== null ? parsed : {};
	} catch {
		return {};
	}
};

export const saveValues = (values: PlaygroundValues) => {
	history.replaceState(null, '', `#${encode(values)}`);
};
export const loadValues = (): Partial<PlaygroundValues> | null => {
	return location.hash ? decode(location.hash.slice(1)) : null;
};
