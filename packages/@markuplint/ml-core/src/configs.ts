import type { Config } from '@markuplint/ml-config';

export async function getPreset(name: string): Promise<Config> {
	const json = await import(`@markuplint/config-presets/preset.${name}.json`).catch(() => new Error());

	if (json instanceof Error) {
		throw new ReferenceError(`Preset markuplint:${name} is not found`);
	}

	return json.default as Config;
}
