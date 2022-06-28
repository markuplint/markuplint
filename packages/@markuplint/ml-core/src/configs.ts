import type { Config } from '@markuplint/ml-config';

export async function getPreset(name: string): Promise<Config> {
	const json = await import(`@markuplint/config-presets/preset.${name}.json`);
	return json.default as Config;
}
