import type { DistTag } from '../modules/dist-tag';
import type { JSONSchema } from '../modules/json-schema';
import type { Rules, AnyRule } from '@markuplint/ml-config';

import { memo, useCallback, useEffect, useState } from 'react';

import { fetchDereferencedSchema } from '../modules/json-schema';

import { ConfigRule } from './ConfigRule';

type Props = Readonly<{
	distTag: DistTag;
	onChange?: (rules: Rules) => void;
}>;

const SchemaEditorRaw = ({ distTag, onChange }: Props) => {
	const [schema, setSchema] = useState<JSONSchema | null>(null);
	const [rulesConfig, setRulesConfig] = useState<Rules | null>(null);
	const rulesDefinition = schema?.properties?.rules;
	const rulesDefaultDefinition = typeof rulesDefinition === 'boolean' ? null : rulesDefinition?.oneOf?.[0];
	const ruleSchemas = typeof rulesDefaultDefinition === 'boolean' ? null : rulesDefaultDefinition?.properties;

	useEffect(() => {
		setSchema(null);
		if (!distTag) {
			return;
		}
		void (async () => {
			try {
				// get version
				const version = await (async () => {
					const response = await fetch('https://registry.npmjs.org/markuplint');
					const json = await response.json();
					const version = json['dist-tags'][distTag];
					if (typeof version !== 'string') {
						throw new TypeError('Invalid version');
					}
					return version;
				})();

				// get schema
				const url = `https://raw.githubusercontent.com/markuplint/markuplint/v${version}/config.schema.json`;
				const dereferencedSchema = await fetchDereferencedSchema(new URL(url));
				if (dereferencedSchema !== undefined && typeof dereferencedSchema !== 'boolean') {
					setSchema(dereferencedSchema);
				}
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error(error);
			}
		})();
	}, [distTag]);

	const handleChange = useCallback(
		(name: string) => (rule: AnyRule) => {
			const newConfig =
				rule == null
					? (() => {
							const { [name]: _, ...updated } = rulesConfig ?? {};
							return updated;
					  })()
					: { ...rulesConfig, [name]: rule };
			setRulesConfig(newConfig);
			onChange?.(newConfig);
		},
		[onChange, rulesConfig],
	);

	return (
		<div>
			{ruleSchemas == null ? (
				<p>Loading...</p>
			) : (
				Object.entries(ruleSchemas).map(
					([key, ruleSchema]) =>
						typeof ruleSchema !== 'boolean' && (
							<ConfigRule key={key} name={key} schema={ruleSchema} onChange={handleChange(key)} />
						),
				)
			)}
		</div>
	);
};

export const SchemaEditor = memo(SchemaEditorRaw);
