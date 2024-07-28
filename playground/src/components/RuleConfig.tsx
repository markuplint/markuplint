import type { JsonValue } from '../modules/json';
import type { AnyRule } from '@markuplint/ml-config';
import type { JSONSchema7Definition } from 'json-schema';
import type { ReactNode } from 'react';

import { createContext, useContext, useCallback, useEffect, useState, useMemo, memo, useId } from 'react';

import { isJSONSchema, type JSONSchema } from '../modules/json-schema';

const locale = navigator.language;
const localeWithoutRegion = locale.split('-')[0];

type Props = Readonly<{
	value: AnyRule;
	ruleName: string;
	schema: JSONSchema;
	onChange: (ruleName: string, rule: AnyRule) => void;
}>;
const RuleConfigRaw = ({ value, ruleName, schema, onChange }: Props) => {
	const [valueSelect, setValueSelect] = useState<string>('unset');
	const [customConfig, setCustomConfig] = useState<Readonly<Record<string, any>>>({});
	const headingId = useId();
	const handleChangeCustom = useCallback(
		(value: any | undefined) => {
			const newCustomConfig = value ?? {};
			setCustomConfig(newCustomConfig);
			onChange(ruleName, newCustomConfig);
		},
		[onChange, ruleName],
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
		return <NotSupported schema={schema} />;
	}

	const customs = schema.oneOf.find(
		one => typeof one !== 'boolean' && one.properties && 'value' in one.properties && one.properties?.['severity'],
	);

	const defaultValue = schema.oneOf
		.filter((one): one is Exclude<typeof one, boolean> => typeof one !== 'boolean' && one.type !== 'boolean')
		.find(one => one.default !== undefined)?.default;

	return (
		<div className="border-t pb-4 pt-3">
			<div className="flex flex-wrap gap-y-2 px-4">
				<h4 className="min-w-[13em] grow">
					<code>
						<a
							className="text-ml-blue underline"
							href={`https://markuplint.dev${
								localeWithoutRegion === 'ja' ? '/ja' : ''
							}/docs/rules/${ruleName}`}
							target="_blank"
							rel="noreferrer"
						>
							<span id={headingId}>{ruleName}</span>
							<span className="icon-majesticons-open ml-1 translate-y-1 overflow-hidden">
								(Open in new tab)
							</span>
						</a>
						:
					</code>
				</h4>
				<select
					aria-labelledby={headingId}
					className="select-arrow ml-6 w-[8em] rounded-md border border-slate-300"
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
						onChange(ruleName, newRuleConfig);
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
						.map(one =>
							one.enum?.map(keyword =>
								typeof keyword === 'string' ? (
									<option key={keyword} value={keyword}>
										{`"${keyword}"`}
									</option>
								) : null,
							),
						)}

					{isJSONSchema(customs) && <option value="custom">custom...</option>}
				</select>
			</div>
			{isJSONSchema(customs) && valueSelect === 'custom' && (
				<div className="mt-4 overflow-x-auto px-4">
					<NestedObject schema={customs} value={customConfig} onChange={handleChangeCustom} />
				</div>
			)}
		</div>
	);
};
export const RuleConfig = memo(RuleConfigRaw);

const Nested = ({
	value,
	schema,
	onChange,
}: Readonly<{
	value: any;
	schema: JSONSchema7Definition;
	onChange?: (value: any) => void;
}>): ReactNode => {
	if (typeof schema === 'boolean') {
		return null;
	} else if (schema.oneOf) {
		return <NestedOneOf schemas={schema.oneOf} value={value} onChange={onChange} />;
	} else if (
		schema.type !== undefined &&
		!Array.isArray(schema.type) // array is not supported
	) {
		switch (schema.type) {
			case 'boolean': {
				return <NestedBoolean schema={schema} value={value} onChange={onChange} />;
			}
			case 'string': {
				return <NestedString schema={schema} value={value} onChange={onChange} />;
			}
			case 'number':
			case 'integer': {
				return <NestedNumber schema={schema} value={value} onChange={onChange} />;
			}
			case 'array': {
				return <NestedArray schema={schema} value={value} onChange={onChange} />;
			}
			case 'object': {
				return <NestedObject schema={schema} value={value} onChange={onChange} />;
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
		return <NotSupported schema={schema} />;
	}
};

const NestedArray = ({
	value,
	schema,
	onChange,
}: Readonly<{
	value: readonly any[];
	schema: JSONSchema;
	onChange?: (value: readonly any[]) => void;
}>): ReactNode => {
	const { depth, parentType } = useContext(NestContext);
	const [values, setValues] = useState<readonly any[]>([null]);
	useEffect(() => {
		// not supported
		// TODO: support this pattern
	}, [value]);
	const handleChange = useCallback(
		(index: number) => (value: any) => {
			const newValues = [...values];
			newValues[index] = value;
			setValues(newValues);
			onChange?.(newValues);
		},
		[values, onChange],
	);
	const handleAdd = useCallback(() => {
		const newValues = [...values, null];
		setValues(newValues);
		onChange?.(newValues);
	}, [values, onChange]);
	const handleRemove = useCallback(
		(index: number) => () => {
			const newValues = [...values];
			newValues.splice(index, 1);
			setValues(newValues);
			onChange?.(newValues);
		},
		[values, onChange],
	);

	const schemaItems = schema.items;

	if (Array.isArray(schemaItems) || schemaItems === undefined) {
		return <NotSupported schema={schema} />;
	}
	return (
		<div className={`${parentType === 'object' ? 'w-full' : ''}`}>
			<div className="w-fit rounded-md border">
				<NestContext.Provider value={{ depth, parentType: 'array' }}>
					<ul>
						{values.map((v, i) => (
							<li key={i} className="flex items-baseline gap-2 border-b p-3">
								<div className="flex flex-wrap gap-2">
									<Nested schema={schemaItems} value={v} onChange={handleChange(i)} />
								</div>
								<button
									type="button"
									onClick={handleRemove(i)}
									className="flex items-center justify-center gap-1 rounded-full bg-slate-100 p-2 shadow-sm transition-colors hover:bg-red-100"
								>
									<span className="icon-heroicons-solid-minus overflow-hidden">Remove</span>
								</button>
							</li>
						))}
					</ul>
				</NestContext.Provider>
				<p>
					<button
						type="button"
						onClick={handleAdd}
						className="flex w-full items-center justify-center gap-1 bg-slate-100 px-2 py-1 text-sm shadow-sm"
					>
						<span className="icon-heroicons-solid-plus overflow-hidden"></span>
						Add item
					</button>
				</p>
			</div>
		</div>
	);
};

const flattenSchemas = (schemas: readonly JSONSchema7Definition[]): readonly JSONSchema7Definition[] =>
	schemas.flatMap(schema =>
		typeof schema === 'boolean' ? schema : schema.oneOf ? flattenSchemas(schema.oneOf) : schema,
	);

const NestedOneOf = ({
	value,
	schemas,
	onChange,
}: Readonly<{
	value: any;
	schemas: readonly JSONSchema7Definition[];
	onChange?: (value: any) => void;
}>): ReactNode => {
	const flattenedSchemas = useMemo(() => flattenSchemas(schemas), [schemas]);
	const [selected, setSelected] = useState<number>(0);
	const [valueStates, setValueStates] = useState<any[]>(Array.from({ length: flattenedSchemas.length }).fill(null));
	const selectedSchema = flattenedSchemas[selected];

	useEffect(() => {
		// not supported
		// TODO: support this pattern
	}, [value]);
	const handleChange = useCallback(
		(index: number) => (value: any) => {
			onChange?.(value);
			const newValue = [...valueStates];
			newValue[index] = value;
			setValueStates(newValue);
		},
		[onChange, valueStates],
	);

	const getSummary = (schema: JSONSchema7Definition): string => {
		if (typeof schema === 'boolean') {
			return String(schema);
		}
		if (schema.oneOf) {
			return 'oneOf...';
		}
		if (schema.type === undefined || Array.isArray(schema.type)) {
			return '(not supported)';
		}
		switch (schema.type) {
			case 'array': {
				return 'array';
			}
			case 'object': {
				return schema.properties ? `object (${Object.keys(schema.properties).join(', ')})` : 'object';
			}
			case 'string': {
				return schema.enum ? 'string (enum)' : 'string';
			}
			case 'integer':
			case 'number': {
				return 'number';
			}
			case 'boolean': {
				return 'boolean';
			}
			case 'null': {
				return 'null';
			}
			default: {
				schema.type satisfies never;
				return '';
			}
		}
	};
	return (
		<>
			<label className="py-1 text-sm">
				Type{' '}
				<select
					value={selected}
					onChange={e => {
						const value = e.currentTarget.value;
						const valueNumber = Number(value);
						setSelected(valueNumber);
						handleChange(valueNumber)(valueStates[valueNumber]);
					}}
					className="select-arrow max-w-[10rem] rounded-xl border border-slate-300 bg-slate-300 text-black"
				>
					{flattenedSchemas.map((s, i) => (
						<option key={i} value={i}>
							{getSummary(s)}
						</option>
					))}
				</select>
			</label>
			<Nested schema={selectedSchema} value={valueStates[selected]} onChange={handleChange(selected)} />
			{/* NOTE: `schema.description` may be useful  */}
		</>
	);
};

const NestContext = createContext<{ depth: number; parentType: 'object' | 'array' | 'oneOf' | undefined }>({
	depth: 0,
	parentType: undefined,
});

const NestedObject = ({
	value,
	schema,
	onChange,
}: Readonly<{
	value: Readonly<Record<string, JsonValue>> | undefined;
	schema: JSONSchema;
	onChange?: (value: Readonly<Record<string, JsonValue>> | undefined) => void;
}>): ReactNode => {
	const { depth, parentType } = useContext(NestContext);
	const [valueState, setValueState] = useState<Record<string, JsonValue>>(value ?? {});
	useEffect(() => {
		setValueState(value ?? {});
	}, [value]);

	const handleChange = useCallback(
		(key: string) => (value: JsonValue) => {
			const updated = (() => {
				if (value == null) {
					const { [key]: _, ...updated } = valueState;
					return Object.keys(updated).length === 0 ? undefined : updated;
				} else {
					return { ...valueState, [key]: value };
				}
			})();
			setValueState(updated ?? {});
			onChange?.(updated);
		},
		[valueState, onChange],
	);

	if (!schema.properties) {
		return <NotSupported schema={schema} />;
	}
	return (
		<NestContext.Provider value={{ depth: depth + 1, parentType: 'object' }}>
			<ul className={`grid gap-2 ${parentType === 'object' ? 'w-full' : ''}`}>
				{Object.entries(schema.properties).map(([key, property]) =>
					// @ts-expect-error
					property.deprecated === true ? null : (
						<li key={key}>
							<details
								className="flex flex-row flex-wrap items-baseline gap-y-1 [&>summary>span]:icon-majesticons-chevron-right [&>:nth-child(n+2)]:ml-6 [&>summary>span]:open:rotate-90 [&>summary>span]:open:text-opacity-40"
								open
							>
								<summary className="inline-flex w-fit items-baseline gap-2 py-2">
									<span className="translate-y-0.5 text-slate-500 transition-transform"></span>
									<code>{key}:</code>
								</summary>
								<Nested schema={property} onChange={handleChange(key)} value={valueState?.[key]} />
							</details>
						</li>
					),
				)}
			</ul>
		</NestContext.Provider>
	);
};

const NestedBoolean = ({
	value,
	schema,
	onChange,
}: Readonly<{
	value: boolean | undefined;
	schema: JSONSchema;
	onChange?: (value: boolean | undefined) => void;
}>): ReactNode => {
	const [valueState, setValueState] = useState<string>('unset');
	useEffect(() => {
		switch (value) {
			case true: {
				setValueState('true');
				break;
			}
			case false: {
				setValueState('false');
				break;
			}
			case undefined: {
				setValueState('unset');
				break;
			}
		}
	}, [value]);
	const handleChange = useCallback(
		(value: string) => {
			setValueState(value);
			const newValue = (() => {
				switch (value) {
					case 'true': {
						return true;
					}
					case 'false': {
						return false;
					}
					case 'unset': {
						return;
					}
				}
			})();
			onChange?.(newValue);
		},
		[onChange],
	);

	const defaultValue = schema.default;
	return (
		<select
			className="select-arrow rounded-md border border-slate-300"
			value={valueState}
			onChange={e => {
				const value = e.currentTarget.value;
				handleChange(value);
			}}
		>
			<option value="unset">(unset{defaultValue !== undefined && `: ${defaultValue}`})</option>
			{['true', 'false'].map(keyword => (
				<option key={keyword} value={keyword}>
					{keyword}
				</option>
			))}
		</select>
	);
};

const NestedNumber = ({
	value,
	schema,
	onChange,
}: Readonly<{
	value: number | undefined;
	schema: JSONSchema;
	onChange?: (value: number | undefined) => void;
}>): ReactNode => {
	const [valueState, setValueState] = useState<string>('');
	useEffect(() => {
		setValueState(value === undefined ? '' : String(value));
	}, [value]);
	const handleChange = useCallback(
		(value: string) => {
			setValueState(value);
			onChange?.(value === '' ? undefined : Number(value));
		},
		[onChange],
	);

	return (
		<input
			className="rounded-md border border-slate-300 px-1 py-0.5"
			type="number"
			min={schema.minimum}
			value={valueState}
			onChange={e => {
				const value = e.currentTarget.value;
				handleChange(value);
			}}
		/>
	);
};

const NestedString = ({
	value,
	schema,
	onChange,
}: Readonly<{
	value: string | undefined;
	schema: JSONSchema;
	onChange?: (value: string | undefined) => void;
}>): ReactNode => {
	const [valueState, setValueState] = useState<string>('');
	useEffect(() => {
		setValueState(value ?? '');
	}, [value]);
	const handleChange = useCallback(
		(value: string) => {
			setValueState(value);
			onChange?.(value === '' ? undefined : value);
		},
		[onChange],
	);

	return (
		<>
			{schema.enum ? (
				<select
					className="select-arrow rounded-md border border-slate-300"
					value={valueState}
					onChange={e => {
						handleChange(e.currentTarget.value);
					}}
				>
					<option value={''}>(unset{schema.default !== undefined && `: "${schema.default}"`})</option>
					{schema.enum.map(
						keyword =>
							typeof keyword === 'string' && (
								<option key={keyword} value={keyword}>{`"${keyword}"`}</option>
							),
					)}
				</select>
			) : (
				<span className="shrink-0">
					&quot;{' '}
					<input
						className="rounded-md border border-slate-300 px-2 py-0.5"
						type="text"
						value={valueState}
						onChange={e => {
							handleChange(e.currentTarget.value);
						}}
					/>{' '}
					&quot;
				</span>
			)}
		</>
	);
};

const NotSupported = ({ schema }: Readonly<{ schema: JSONSchema }>): ReactNode => {
	return (
		<div className="grid gap-1 text-xs">
			<p>Sorry! This type is not supported in visual editor</p>
			<details>
				<summary>
					Show JSON Schema <span className="icon-majesticons-chevron-down"></span>
				</summary>
				<pre>{JSON.stringify(schema, null, 2)}</pre>
			</details>
		</div>
	);
};
