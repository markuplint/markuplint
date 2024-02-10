import type { Rules, Config } from '@markuplint/ml-config';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { FileTypeSelector } from './FileTypeSelector';
import { PresetsSelector } from './PresetsSelector';
import { RulesSelector } from './RulesSelector';

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
		specs: { '\\.svelte$': '@markuplint/svelte-spec' },
	},
};

type Props = Readonly<{
	version?: string;
	fileType: string;
	config: Config;
	onChangeFileType: (fileType: string) => void;
	onChangeConfig: (config: Config) => void;
}>;

export const ConfigForm = ({ fileType, config, version, onChangeFileType, onChangeConfig }: Props) => {
	const [, setConfigState] = useState<Config>(config);
	useEffect(() => {
		setConfigState(config);
	}, [config]);

	const handleChangeFileType = useCallback(
		(newFileType: string) => {
			onChangeFileType(newFileType);
			const parserAndSpecs = mapping[newFileType] ?? {};

			setConfigState(prev => {
				const writableConfig = { ...prev };
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
				onChangeConfig(writableConfig);
				return writableConfig;
			});
		},
		[onChangeConfig, onChangeFileType],
	);

	const rules = useMemo((): Rules => {
		const { rules } = config;
		return rules ?? {};
	}, [config]);
	const handleChangeRules = useCallback(
		(newRules: Rules) => {
			setConfigState(prev => {
				const writableConfig = { ...prev };
				if (Object.keys(newRules).length === 0) {
					delete writableConfig.rules;
				} else {
					writableConfig.rules = newRules;
				}
				onChangeConfig(writableConfig);
				return writableConfig;
			});
		},
		[onChangeConfig],
	);

	const presets = useMemo((): readonly string[] => {
		const { extends: extendsValue } = config;
		return Array.isArray(extendsValue) ? extendsValue : [];
	}, [config]);
	const handleChangePresets = useCallback(
		(newPresets: readonly string[]) => {
			setConfigState(prev => {
				const writableConfig = { ...prev };
				if (newPresets.length === 0) {
					delete writableConfig.extends;
				} else {
					writableConfig.extends = newPresets;
				}
				onChangeConfig(writableConfig);
				return writableConfig;
			});
		},
		[onChangeConfig],
	);

	return (
		<div className="grid gap-2 px-4 py-4">
			<details open className="group overflow-hidden rounded-lg border">
				<summary className="border-slate-300 bg-slate-100 font-medium -outline-offset-2">
					<h3 className="flex items-center justify-between gap-2 px-4 py-2">
						Parser &amp; Specs
						<span className="icon-heroicons-solid-chevron-down text-xl group-open:icon-heroicons-solid-chevron-up" />
					</h3>
				</summary>
				<FileTypeSelector value={fileType} onChange={handleChangeFileType} />
			</details>
			<details open className="group overflow-hidden rounded-lg border">
				<summary className="border-slate-300 bg-slate-100 font-medium -outline-offset-2">
					<h3 className="flex items-center justify-between gap-2 px-4 py-2">
						Presets
						<span className="icon-heroicons-solid-chevron-down text-xl group-open:icon-heroicons-solid-chevron-up" />
					</h3>
				</summary>
				<PresetsSelector fileType={fileType} value={presets} onChange={handleChangePresets} />
			</details>
			<details open className="group overflow-hidden rounded-lg border">
				<summary className="border-slate-300 bg-slate-100 font-medium -outline-offset-2">
					<h3 className="flex items-center justify-between gap-2 px-4 py-2">
						Rules
						<span className="icon-heroicons-solid-chevron-down text-xl group-open:icon-heroicons-solid-chevron-up" />
					</h3>
				</summary>
				{version && <RulesSelector value={rules} version={version} onChange={handleChangeRules} />}
			</details>
		</div>
	);
};
