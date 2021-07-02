import { memo, useEffect, useState } from 'react';
import { getSchema, Schema } from './json-schema';
import { ConfigRule } from './ConfigRule';

export const Config = memo(() => {
	const [schema, setSchema] = useState<Schema>({});

	useEffect(() => {
		console.log('Config boot');

		(async () => {
			const schema = await getSchema(
				'https://raw.githubusercontent.com/markuplint/markuplint/main/config.schema.json',
			);
			if (!schema) {
				return;
			}
			setSchema(schema);
		})();
	}, []);

	const rules = schema?.properties?.['rules']?.properties;

	console.log(rules);

	return (
		<div className="w-full h-full">
			<h2>Configuraton</h2>

			<div className="pl-3" aria-busy={!rules}>
				<h3>Rules</h3>
				{rules ? (
					Object.keys(rules).map(key => <ConfigRule key={key} name={key} schema={rules[key]} />)
				) : (
					<div>Loading...</div>
				)}
			</div>
		</div>
	);
});

function ___(schema: Schema, depth = 0): JSX.Element | JSX.Element[] | null {
	if (schema.oneOf) {
		return (
			<>
				<ul className="pl-3">
					{schema.oneOf.map((s, i) => (
						<li
							key={`schema_${depth}_${i}`}
							className="border-b-2 mb-2 pb-2 last:border-0 last:m-0 last:p-0"
						>
							<div>{___(s, depth + 1)}</div>
						</li>
					))}
				</ul>
			</>
		);
	}
	switch (schema.type) {
		case 'string': {
			if (schema.enum) {
				return (
					<select className="border-2">
						{schema.enum.map((keyword, i) => (
							<option key={`schema_${depth}_${i}_${keyword}`}>{keyword}</option>
						))}
					</select>
				);
			}
			return (
				<>
					<input className="border-2" type="text" />
				</>
			);
		}
		case 'number': {
			return (
				<>
					<input className="border-2" type="number" />
				</>
			);
		}
		case 'boolean': {
			return (
				<>
					<select className="border-2">
						<option>true</option>
						<option>false</option>
					</select>
				</>
			);
		}
		case 'array': {
			if (Array.isArray(schema.items)) {
				// Don't support this pattern
				return null;
			}
			if (!schema.items) {
				return null;
			}
			return (
				<>
					<div>Multiple</div>
					{___(schema.items)}
				</>
			);
		}
		case 'object': {
			if (!schema.properties) {
				return null;
			}
			return (
				<>
					{Object.keys(schema.properties).map(key => (
						<div key={`schema_${depth}_${key}`} className="pl-3">
							<h4>{key}</h4>
							<div className="pl-3">{___(schema.properties![key])}</div>
						</div>
					))}
				</>
			);
		}
	}
	return null;
}
