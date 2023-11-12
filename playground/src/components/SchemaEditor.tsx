import type { JSONSchema } from '../modules/json-schema';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

import { fetchDereferencedSchema } from '../modules/json-schema';

import { ConfigRule } from './ConfigRule';

export type SchemaEditorRef = {
	getValue: () => string;
	setValue: (code: string) => void;
};

type Props = {
	markuplintVersion: `v${string}` | null;
	onChangeValue?: (code: string) => void;
	onChangeFilename?: (filename: string) => void;
};

export const SchemaEditor = forwardRef<SchemaEditorRef, Props>(({ markuplintVersion }, ref) => {
	const [schema, setSchema] = useState<JSONSchema | null>(null);
	const rulesDefinition = schema?.properties?.rules;
	const rules = typeof rulesDefinition === 'boolean' ? null : rulesDefinition?.properties;

	useEffect(() => {
		setSchema(null);
		if (!markuplintVersion) {
			return;
		}
		void (async () => {
			try {
				const url = `https://raw.githubusercontent.com/markuplint/markuplint/${markuplintVersion}/config.schema.json`;
				// const res = await fetch(url);
				// const json = await res.json();
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

	useImperativeHandle(
		ref,
		() => {
			return {
				getValue: () => {
					// TODO
					return '';
				},
				setValue: (code: string) => {
					// TODO
					console.log(code);
				},
			};
		},
		[],
	);

	return (
		<div>
			{rules == null ? (
				<div>Loading...</div>
			) : (
				Object.entries(rules).map(
					([key, rule]) => typeof rule !== 'boolean' && <ConfigRule key={key} name={key} schema={rule} />,
				)
			)}
		</div>
	);
});
