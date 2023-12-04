import type { Rules, Config } from '@markuplint/ml-config';

import { useCallback, useMemo } from 'react';

import { parseJsonc } from '../modules/json';

import { FileTypeSelector } from './FileTypeSelector';
import { PresetsSelector } from './PresetsSelector';
import { RulesSelector } from './RulesSelector';

type Props = Readonly<{
	version?: string;
	fileType: string;
	config: string;
	onChangeFileType: (fileType: string) => void;
	onChangeConfig: (config: string) => void;
}>;

export const ConfigForm = ({ fileType, config: config, version, onChangeFileType, onChangeConfig }: Props) => {
	const parsedConfig: Config = useMemo(() => parseJsonc(config) ?? {}, [config]);

	const handleChangeFileType = useCallback(
		(newFileType: string) => {
			onChangeFileType(newFileType);
			const writableConfig = { ...parsedConfig };
			const mapping: Readonly<Record<string, Pick<Config, 'parser' | 'specs'>>> = {
				'.jsx': {
					parser: { '\\.jsx$': '@markuplint/jsx-parser' },
					specs: { '\\.jsx$': '@markuplint/react-spec' },
				},
				'.vue': {
					parser: { '\\.vue$': '@markuplint/vue-parser' },
					specs: { '\\.vue$': '@markuplint/vue-spec' },
				},
				'.svelte': {
					parser: { '\\.svelte$': '@markuplint/svelte-parser' },
				},
			};
			const parserAndSpecs = mapping[newFileType] ?? {};
			if (parserAndSpecs.parser) {
				writableConfig.parser = parserAndSpecs.parser;
			} else {
				delete writableConfig.parser;
			}
			if (parserAndSpecs.specs) {
				writableConfig.specs = parserAndSpecs.specs;
			} else {
				delete writableConfig.specs;
			}
			onChangeConfig(JSON.stringify(writableConfig, null, 2));
		},
		[onChangeConfig, onChangeFileType, parsedConfig],
	);

	const rules = useMemo((): Rules => {
		const { rules } = parsedConfig;
		return rules ?? {};
	}, [parsedConfig]);
	const handleChangeRules = useCallback(
		(newRules: Rules) => {
			const writableConfig = { ...parsedConfig };
			if (Object.keys(newRules).length === 0) {
				delete writableConfig.rules;
			} else {
				writableConfig.rules = newRules;
			}
			onChangeConfig(JSON.stringify(writableConfig, null, 2));
		},
		[onChangeConfig, parsedConfig],
	);

	const presets = useMemo((): readonly string[] => {
		const { extends: extendsValue } = parsedConfig;
		return Array.isArray(extendsValue) ? extendsValue : [];
	}, [parsedConfig]);
	const handleChangePresets = useCallback(
		(newPresets: readonly string[]) => {
			const writableConfig = { ...parsedConfig };
			if (newPresets.length === 0) {
				delete writableConfig.extends;
			} else {
				writableConfig.extends = newPresets;
			}
			onChangeConfig(JSON.stringify(writableConfig, null, 2));
		},
		[onChangeConfig, parsedConfig],
	);

	return (
		<div className="grid gap-2 px-4 py-4">
			<details open className="group overflow-hidden rounded-lg border">
				<summary
					className="
                flex items-center justify-between gap-2 border-slate-300 bg-slate-100 
                px-4 py-2 font-medium -outline-offset-2
            "
				>
					<h3>Parser &amp; Specs</h3>
					<span className="icon-heroicons-solid-chevron-down text-xl group-open:icon-heroicons-solid-chevron-up" />
				</summary>
				<FileTypeSelector value={fileType} onChange={handleChangeFileType} />
			</details>
			<details open className="group overflow-hidden rounded-lg border">
				<summary
					className="
            flex items-center justify-between gap-2 border-slate-300 bg-slate-100 
            px-4 py-2 font-medium -outline-offset-2
        "
				>
					<h3>Presets</h3>
					<span className="icon-heroicons-solid-chevron-down text-xl group-open:icon-heroicons-solid-chevron-up" />
				</summary>
				<PresetsSelector fileType={fileType} value={presets} onChange={handleChangePresets} />
			</details>
			<details open className="group overflow-hidden rounded-lg border">
				<summary
					className="
                flex items-center justify-between gap-2 border-slate-300 bg-slate-100 
                px-4 py-2 font-medium -outline-offset-2
            "
				>
					<h3>Rules</h3>
					<span className="icon-heroicons-solid-chevron-down text-xl group-open:icon-heroicons-solid-chevron-up" />
				</summary>
				{version && <RulesSelector value={rules} version={version} onChange={handleChangeRules} />}
			</details>
		</div>
	);
};
