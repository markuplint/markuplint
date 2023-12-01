import type { JSONSchema } from '../modules/json-schema';
import type { AnyRule } from '@markuplint/ml-config';
import type { JSONSchema7Definition } from 'json-schema';
import type { ReactNode } from 'react';

import { useCallback, useEffect, useState } from 'react';

const locale = navigator.language;
const localeWithoutRegion = locale.split('-')[0];

type Props = Readonly<{
	value: AnyRule;
	name: string;
	schema: JSONSchema;
	onChange?: (rule: AnyRule) => void;
}>;
export const ConfigRule = ({ value, name, schema, onChange }: Props) => {
	const [valueSelect, setValueSelect] = useState<string>('unset');
	const [, setRuleConfig] = useState<AnyRule | null>(null);
	const [customConfig, setCustomConfig] = useState<object>({});
	const handleChangeCustom = useCallback(
		(value: any | undefined) => {
			const newCustomConfig = value ?? {};
			setCustomConfig(newCustomConfig);
			onChange?.(newCustomConfig);
		},
		[onChange],
	);

	useEffect(() => {
		switch (value) {
			case true: {
				setValueSelect('true');
				break;
			}
			case false: {
				setValueSelect('false');
				break;
			}
			case null:
			case undefined: {
				setValueSelect('unset');
				break;
			}
			default: {
				if (typeof value === 'string') {
					setValueSelect(value);
				} else if (typeof value === 'object') {
					setValueSelect('custom');
					setCustomConfig(value);
				}
			}
		}
	}, [value]);

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

	return (
		<div className="pt-3 pb-4 px-4 border-t">
			<div className="flex flex-wrap gap-2">
				<h4 className="grow min-w-[13em]">
					<a
						className="underline text-ml-blue"
						href={`https://markuplint.dev${localeWithoutRegion === 'ja' ? '/ja' : ''}/docs/rules/${name}`}
						target="_blank"
						rel="noreferrer"
					>
						{name}
					</a>
				</h4>
				{/* FIXME: this select element has no accessible name */}
				<select
					className="select-arrow border border-slate-300 rounded-md w-[8em]"
					value={valueSelect}
					onChange={e => {
						const value = e.currentTarget.value;
						const newRuleConfig = (() => {
							switch (value) {
								case 'custom': {
									return customConfig;
								}
								case 'unset': {
									return null;
								}
								case 'true': {
									return true;
								}
								case 'false': {
									return false;
								}
								default: {
									return value;
								}
							}
						})();

						setValueSelect(value);
						setRuleConfig(newRuleConfig);
						onChange?.(newRuleConfig);
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
				<div className="mt-2" hidden={valueSelect !== 'custom'}>
					<div className="grid gap-2 pl-4">
						<Nested schema={customs} onChange={handleChangeCustom} />
					</div>
				</div>
			)}
		</div>
	);
};

const Nested = ({
	schema,
	depth = 0,
	onChange,
}: Readonly<{
	schema: JSONSchema7Definition;
	depth?: number;
	onChange?: (value: any) => void;
}>): ReactNode => {
	const [configValue, setConfigValue] = useState<any>(null);

	const handleChange = useCallback(
		(name: string) => (value: any) => {
			if (value == null) {
				const { [name]: _, ...updated } = configValue;
				setConfigValue(updated);
				onChange?.(updated);
			} else {
				const updated = { ...configValue, [name]: value };
				setConfigValue(updated);
				onChange?.(updated);
			}
		},
		[configValue, onChange],
	);

	if (typeof schema === 'boolean') {
		return null;
	} else if (schema.oneOf) {
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
							className="select-arrow border border-slate-300 rounded-md "
							onChange={e => {
								let value: boolean | undefined;
								if (e.currentTarget.value === 'true') {
									value = true;
								} else if (e.currentTarget.value === 'false') {
									value = false;
								} else {
									value = undefined;
								}
								onChange?.(value);
								setConfigValue(value);
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
							className="select-arrow border border-slate-300 rounded-md"
							onChange={e => {
								const value = e.currentTarget.value;
								const newConfigValue = value === '' ? undefined : value;
								setConfigValue(newConfigValue);
								onChange?.(newConfigValue);
							}}
						>
							<option value={''}>(unset{defaultValue !== undefined && ` ("${defaultValue}")`})</option>
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
							className="border border-slate-300 rounded-md px-1 py-0.5"
							type="text"
							onChange={e => {
								const value = e.currentTarget.value;
								const newConfigValue = value.length === 0 ? undefined : value;
								setConfigValue(newConfigValue);
								onChange?.(newConfigValue);
							}}
						/>
					);
				}
			}
			case 'number':
			case 'integer': {
				return (
					<>
						<input
							className="border border-slate-300 rounded-md px-1 py-0.5"
							type="number"
							min={schema.minimum}
						/>
					</>
				);
			}
			case 'array': {
				if (Array.isArray(schema.items)) {
					// this pattern is not supported
					return null;
				} else if (schema.items === undefined) {
					return null;
				} else {
					return (
						<>
							<p>&apos;array&apos;</p>
							<Nested schema={schema.items} depth={depth + 1} />
						</>
					);
				}
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
										<Nested schema={property} depth={depth + 1} onChange={handleChange(key)} />
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
				schema.type satisfies never;
				throw new Error('This code should not be called');
			}
		}
	} else {
		return <p>Sorry! This option is not supported on this playground</p>;
	}
};
