import type { Config } from '@markuplint/ml-config';

export async function getPreset(name: string): Promise<Config> {
	const res = await fetch(`@markuplint/config-presets/preset.${name}.json`).catch(() => new Error());

	if (res instanceof Error) {
		throw new ReferenceError(`Preset markuplint:${name} is not found`);
	}

	const json = await res.json();

	return json as Config;
}
