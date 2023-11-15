/* eslint-disable unicorn/no-useless-undefined */
import type { JSONSchema } from '../modules/json-schema';
import type { AnyRule } from '@markuplint/ml-config';
import type { JSONSchema7Definition } from 'json-schema';
import type { ReactNode } from 'react';

import { useEffect, useState } from 'react';

const assertNever = (_x: never) => {
	throw new Error('This code should not be called');
};

type Mode = 'unset' | 'enable' | 'custom';
type Props = Readonly<{
	name: string;
	schema: JSONSchema;
	onChange?: (name: string, rule: AnyRule) => void;
}>;
export const ConfigRule = ({ name, schema, onChange }: Props) => {
	const [mode, setMode] = useState<Mode>('unset');
	const [ruleConfig, setRuleConfig] = useState<AnyRule | null>(null);
	const [customConfig, setCustomConfig] = useState<any>({});
	useEffect(() => {
		onChange?.(name, ruleConfig);
	}, [ruleConfig, onChange, name]);

	const Nested = ({
		schema,
		depth = 0,
		name,
	}: Readonly<{
		schema: JSONSchema7Definition;
		depth?: number;
		name?: string;
	}>): ReactNode => {
		const handleChange = (name: string, value: any | undefined) => {
			if (value === undefined) {
				const { [name]: _, ...updated } = customConfig;
				setCustomConfig(updated);
				setRuleConfig(updated);
			} else {
				const updated = { ...customConfig, [name]: value };
				setCustomConfig(updated);
				setRuleConfig(updated);
			}
		};

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
							{
								<div>
									<Nested schema={s} depth={depth + 1} />
								</div>
							}
						</li>
					))}
				</ul>
			);
		} else if (
			schema.type !== undefined &&
			!Array.isArray(schema.type) // array is not supported
		) {
			switch (schema.type) {
				case 'boolean': {
					return (
						<>
							<select
								className="border-2"
								onChange={e => {
									if (name) {
										if (e.currentTarget.value === 'true') {
											handleChange(name, true);
										} else if (e.currentTarget.value === 'false') {
											handleChange(name, false);
										} else {
											handleChange(name, undefined);
										}
									}
								}}
							>
								<option>(unset)</option>
								{['true', 'false'].map((keyword, i) => (
									<option key={`schema_${depth}_${i}_${keyword}`} value={keyword}>{`${keyword}${
										keyword === schema.default ? ' (default)' : ''
									}`}</option>
								))}
							</select>
						</>
					);
				}
				case 'string': {
					if (schema.enum) {
						const defaultValue = schema.default;
						return (
							<select
								className="border-2"
								onChange={e => {
									if (name) {
										const value = e.currentTarget.value;
										if (value === '') {
											handleChange(name, undefined);
										} else {
											handleChange(name, value);
										}
									}
								}}
							>
								<option value={''}>
									(unset{defaultValue !== undefined && ` ("${defaultValue}")`})
								</option>
								{schema.enum.map(
									(keyword, i) =>
										typeof keyword === 'string' && (
											<option
												key={`schema_${depth}_${i}_${keyword}`}
												value={keyword}
											>{`"${keyword}"`}</option>
										),
								)}
							</select>
						);
					} else {
						return (
							<input
								className="border-2"
								type="text"
								onChange={e => {
									const value = e.currentTarget.value;
									if (name) {
										if (value.length === 0) {
											handleChange(name, undefined);
										} else {
											handleChange(name, value);
										}
									}
								}}
							/>
						);
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
							<Nested schema={schema.items} depth={depth + 1} />
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
										<div className="min-w-[10rem]">
											<Nested schema={property} depth={depth + 1} name={key} />
										</div>
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
	};

	// Rule's schema has `oneOf` property
	if (!schema.oneOf) {
		return null;
	}

	const customs = schema.oneOf.find(
		one => typeof one !== 'boolean' && one.properties && 'value' in one.properties && one.properties?.['severity'],
	);

	const defaultValue = schema.oneOf
		.filter((one): one is Exclude<typeof one, boolean> => typeof one !== 'boolean' && one.type !== 'boolean')
		.find(one => one.default !== undefined)?.default;

	const locale = navigator.language;
	const localeWithoutRegion = locale.split('-')[0];

	return (
		<div className="p-4 border-t">
			<div className="p-1 mb-2 flex flex-wrap">
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
						const value = e.currentTarget.value;
						if (value === 'custom') {
							setMode('custom');
							setRuleConfig(customConfig);
						} else if (value === 'unset') {
							setMode('unset');
							setRuleConfig(null);
						} else {
							setMode('enable');
							if (value === 'true') {
								setRuleConfig(true);
							} else if (value === 'false') {
								setRuleConfig(false);
							} else {
								setRuleConfig(value);
							}
						}
					}}
				>
					<option value="unset">(unset)</option>
					{schema.oneOf.some(one => typeof one !== 'boolean' && one.type === 'boolean') && (
						<>
							<option value="true">
								true
								{defaultValue !== undefined && ` ("${defaultValue}")`}
							</option>
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
										<option key={`rule_${name}_select_${keyword}`} value={keyword}>
											{`"${keyword}"`}
										</option>
									) : null,
								),
						)}

					{customs !== undefined && <option value="custom">custom...</option>}
				</select>
			</div>
			{customs !== undefined && (
				<div hidden={mode !== 'custom'}>
					<div className="grid gap-2 pl-4">
						<Nested schema={customs} />
					</div>
				</div>
			)}
		</div>
	);
};
/* eslint-enable unicorn/no-useless-undefined */
