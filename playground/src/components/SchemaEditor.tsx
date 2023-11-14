import type { JSONSchema } from '../modules/json-schema';
import type { Rules } from '@markuplint/ml-config';

import { memo, useCallback, useEffect, useState } from 'react';

import { fetchDereferencedSchema } from '../modules/json-schema';

import { ConfigRule } from './ConfigRule';

type Props = {
	markuplintVersion: `v${string}` | null;
	onChange?: (rules: Rules) => void;
};

const SchemaEditorRaw = ({ markuplintVersion, onChange }: Readonly<Props>) => {
	const [schema, setSchema] = useState<JSONSchema | null>(null);
	const [rulesConfig, setRulesConfig] = useState<Rules | null>(null);
	const rulesDefinition = schema?.properties?.rules;
	const rulesDefaultDefinition = typeof rulesDefinition === 'boolean' ? null : rulesDefinition?.oneOf?.[0];
	const ruleSchemas = typeof rulesDefaultDefinition === 'boolean' ? null : rulesDefaultDefinition?.properties;
	useEffect(() => {
		onChange?.(rulesConfig ?? {});
	}, [rulesConfig, onChange]);

	useEffect(() => {
		setSchema(null);
		if (!markuplintVersion) {
			return;
		}
		void (async () => {
			try {
				const url = `https://raw.githubusercontent.com/markuplint/markuplint/${markuplintVersion}/config.schema.json`;
				const dereferencedSchema = await fetchDereferencedSchema(new URL(url));
				if (dereferencedSchema !== undefined && typeof dereferencedSchema !== 'boolean') {
					setSchema(dereferencedSchema);
				}
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error(error);
			}
		})();
	}, [markuplintVersion]);

	const handleChange = useCallback((name: string, value: any | undefined) => {
		if (value === undefined || value === null) {
			setRulesConfig(prev => {
				const { [name]: _, ...updated } = prev ?? {};
				return updated;
			});
		} else {
			setRulesConfig(prev => ({ ...prev, [name]: value }));
		}
	}, []);

	return (
		<div>
			{ruleSchemas == null ? (
				<p>Loading...</p>
			) : (
				Object.entries(ruleSchemas).map(
					([key, ruleSchema]) =>
						typeof ruleSchema !== 'boolean' && (
							<ConfigRule key={key} name={key} schema={ruleSchema} onChange={handleChange} />
						),
				)
			)}
		</div>
	);
};

export const SchemaEditor = memo(SchemaEditorRaw);
