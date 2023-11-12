import type { JSONSchema } from '../modules/json-schema';
import type { JSONSchema7Definition } from 'json-schema';
import type { ReactNode } from 'react';

import { useState } from 'react';

const assertNever = (_x: never) => {
	throw new Error('This code should not be called');
};

type Mode = 'unset' | 'enable' | 'custom';
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- JSONSchema cannot be readonly
export const ConfigRule = ({ name, schema }: Readonly<{ name: string; schema: Readonly<JSONSchema> }>) => {
	const [mode, setMode] = useState<Mode>('unset');

	if (schema.oneOf) {
		console.log(name);
		console.log(schema);
	}
	// Rule's schema has `oneOf` property
	if (!schema.oneOf) {
		return null;
	}

	const customs = schema.oneOf.find(
		one => typeof one !== 'boolean' && one.properties && 'value' in one.properties && one.properties?.['severity'],
	);

	const locale = navigator.language;
	const localeWithoutRegion = locale.split('-')[0];

	return (
		<div className="p-2 border-t">
			<div className="p-3 flex flex-wrap">
				<h4 className="grow min-w-[13rem]">
					<a
						className="underline text-blue-600"
						href={`https://markuplint.dev${localeWithoutRegion === 'ja' ? '/ja' : ''}/docs/rules/${name}`}
						target="_blank"
						rel="noreferrer"
					>
						{name}
					</a>
				</h4>
				{/* FIXME: this select element has no accessible name */}
				<select
					className="border-2 w-[10rem]"
					onChange={e => {
						const val = e.currentTarget.value;
						if (val === 'custom') {
							setMode('custom');
						} else if (val === 'unset') {
							setMode('unset');
						} else {
							setMode('enable');
						}
					}}
				>
					<option value="unset">(unset)</option>
					{schema.oneOf.some(one => typeof one !== 'boolean' && one.type === 'boolean') && (
						<>
							<option value="true">true</option>
							<option value="false">false</option>
						</>
					)}
					{schema.oneOf
						.filter(
							(one): one is Exclude<typeof one, boolean> =>
								typeof one !== 'boolean' && one.type !== 'boolean',
						)
						.map(
							one =>
								one.enum?.map(keyword =>
									typeof keyword === 'string' ? (
										<option key={`rule_${name}_select_${keyword}`}>
											{`"${keyword}"`}
											{keyword === one.default && ' (default)'}
										</option>
									) : null,
								),
						)}

					{customs !== undefined && <option value="custom">custom...</option>}
				</select>
			</div>
			{customs !== undefined && (
				<div hidden={mode !== 'custom'}>
					<div className="grid gap-2 pl-4">{nested(customs)}</div>
				</div>
			)}
		</div>
	);
};

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- JSONSchema cannot be readonly
function nested(schema: JSONSchema7Definition, depth = 0): ReactNode {
	if (typeof schema === 'boolean') {
		return null;
	}

	if (schema.oneOf) {
		// recursive
		return (
			<ul>
				{schema.oneOf.map((s, i) => (
					<li key={`schema_${depth}_${i}`} className="relative pt-6 first:pt-0">
						{i > 0 && (
							<div className="absolute top-0 right-0 left-0 px-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4 before:block before:bg-slate-300 before:h-[1px] after:block after:bg-slate-300 after:h-[1px]">
								OR
							</div>
						)}
						{<div>{nested(s, depth + 1)}</div>}
					</li>
				))}
			</ul>
		);
	} else if (
		schema.type !== undefined &&
		!Array.isArray(schema.type) // array is not supported
	) {
		switch (schema.type) {
			case 'string': {
				if (schema.enum) {
					return (
						<select className="border-2">
							{schema.enum.map(
								(keyword, i) =>
									typeof keyword === 'string' && (
										<option key={`schema_${depth}_${i}_${keyword}`}>{`"${keyword}"${
											keyword === schema.default ? ' (default)' : ''
										}`}</option>
									),
							)}
						</select>
					);
				} else {
					return <input className="border-2" type="text" />;
				}
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
							{['true', 'false'].map((keyword, i) => (
								<option key={`schema_${depth}_${i}_${keyword}`}>{`"${keyword}"${
									keyword === schema.default ? ' (default)' : ''
								}`}</option>
							))}
						</select>
					</>
				);
			}
			case 'array': {
				if (Array.isArray(schema.items)) {
					// Don't support this pattern
					return null;
				}
				if (schema.items === undefined) {
					return null;
				}
				return (
					<>
						<p>&apos;array&apos;</p>
						{nested(schema.items, depth + 1)}
					</>
				);
			}
			case 'object': {
				if (!schema.properties) {
					return null;
				}
				return (
					<ul className="grid gap-2 pl-4">
						{Object.entries(schema.properties).map(([key, property]) =>
							// @ts-expect-error
							property.deprecated === true ? null : (
								<li key={`schema_${depth}_${key}`} className="flex flex-wrap gap-2">
									<div className="min-w-[5rem]">
										{depth === 0 ? (
											<h4>{key}:</h4>
										) : depth === 1 ? (
											<h5>{key}:</h5>
										) : (
											<dfn>{key}:</dfn>
										)}
									</div>
									<div className="min-w-[10rem]">{nested(property, depth + 1)}</div>
								</li>
							),
						)}
					</ul>
				);
			}
			case 'null': {
				return null;
			}
			default: {
				assertNever(schema.type);
			}
		}
	} else {
		return <p>Sorry! This option is not supported on this playground</p>;
	}
}
