import { memo, useState } from 'react';
import { Schema } from './json-schema';

export const ConfigRule = memo<{
	name: string;
	schema: Schema;
}>(({ name, schema }) => {
	const [mode, setMode] = useState<'enable' | 'value' | 'custom'>('enable');

	if (!schema.oneOf || schema.oneOf.length > 3) {
		return null;
	}
	let switchEnable: Schema | null = null;
	let setValue: Schema | null = null;
	let customs: Custom | null = null;
	for (const one of schema.oneOf) {
		if (one.type === 'boolean') {
			switchEnable = one;
			continue;
		}
		if (one.properties?.['value'] && one.properties?.['severity']) {
			// @ts-ignore
			customs = one;
			continue;
		}
		setValue = one;
	}

	if (!(switchEnable && customs)) {
		return null;
	}

	console.log({ name, switchEnable, customs, setValue });

	return (
		<div className="pl-3">
			<details open>
				<summary className="cursor-pointer">
					<h4 className="inline-block">{name}</h4>
				</summary>
				<div className="p-3">
					<select
						className="border-2"
						onChange={e => {
							const val = e.currentTarget.value;
							if (val === 'custom') {
								setMode('custom');
							} else {
								setMode('enable');
							}
						}}
					>
						<option value="true">true</option>
						<option value="false">false</option>
						{setValue &&
							setValue.enum &&
							setValue.enum.map(keyword => (
								<option key={`rule_${name}_select_${keyword}`}>{keyword}</option>
							))}
						<option value="custom">custom</option>
					</select>
					{mode === 'custom' && customs && <div>{___(customs)}</div>}
				</div>
			</details>
		</div>
	);
});

type Custom = Schema & {
	properties: {
		value: Schema;
		severity: Schema;
		option?: Schema;
	};
};

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
		case 'number':
		case 'integer': {
			return (
				<>
					<input className="border-2" type="number" min={schema.minimum} />
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
					{___(schema.items, depth + 1)}
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
							{depth === 0 ? <h4>{key}</h4> : depth === 1 ? <h5>{key}</h5> : <dfn>{key}</dfn>}
							<div className="pl-3">{___(schema.properties![key], depth + 1)}</div>
						</div>
					))}
				</>
			);
		}
	}
	return null;
}
