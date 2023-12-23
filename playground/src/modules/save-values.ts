import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

import { isJsonObject, parseJson } from './json';

export const fileTypes = ['.html', '.jsx', '.vue', '.svelte'] as const;

export type PlaygroundValues = Readonly<{
	code: string;
	codeFileType: string;
	config: string;
}>;

const encode = (values: PlaygroundValues): string => {
	return compressToEncodedURIComponent(JSON.stringify(values));
};
const decode = (string: string): Partial<PlaygroundValues> => {
	const decoded = decompressFromEncodedURIComponent(string);

	try {
		const parsed = parseJson(decoded);
		return isJsonObject(parsed) ? parsed : {};
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
