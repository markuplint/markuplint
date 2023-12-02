import type { AnyRule } from '@markuplint/ml-config';
import type { JSONSchema7Definition } from 'json-schema';
import type { ReactNode } from 'react';

import { useCallback, useEffect, useId, useState } from 'react';

import { isJSONSchema, type JSONSchema } from '../modules/json-schema';

type JsonPrimitive = boolean | number | string | null;
type JsonArray = readonly JsonPrimitive[] | readonly JsonObject[];
type JsonObject = Readonly<{
	[key: string]: JsonPrimitive | JsonObject | JsonArray;
}>;
type JsonValue = JsonPrimitive | JsonArray | JsonObject;

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
	const [customConfig, setCustomConfig] = useState<Readonly<Record<string, any>>>({});
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
										<option key={keyword} value={keyword}>
											{`"${keyword}"`}
										</option>
									) : null,
								),
						)}

					{isJSONSchema(customs) && <option value="custom">custom...</option>}
				</select>
			</div>
			{isJSONSchema(customs) && (
				<div className="mt-2" hidden={valueSelect !== 'custom'}>
					<div className="grid gap-2 pl-4">
						<NestedObject schema={customs} value={customConfig} onChange={handleChangeCustom} />
					</div>
				</div>
			)}
		</div>
	);
};

const Nested = ({
	value,
	schema,
	depth = 0,
	onChange,
}: Readonly<{
	value: any;
	schema: JSONSchema7Definition;
	depth?: number;
	onChange?: (value: any) => void;
}>): ReactNode => {
	if (typeof schema === 'boolean') {
		return null;
	} else if (schema.oneOf) {
		return <NestedOneOf depth={depth} schemas={schema.oneOf} value={value} onChange={onChange} />;
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
				if (Array.isArray(schema.items)) {
					// this pattern is not supported
					return null;
				} else if (schema.items === undefined) {
					return null;
				} else {
					return (
						<>
							<p>&apos;array&apos;</p>
							<Nested schema={schema.items} depth={depth} value={value} onChange={onChange} />
						</>
					);
				}
			}
			case 'object': {
				return <NestedObject schema={schema} depth={depth + 1} value={value} onChange={onChange} />;
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

const NestedOneOf = ({
	value,
	depth,
	schemas,
	onChange,
}: Readonly<{
	value: any;
	depth: number;
	schemas: readonly JSONSchema7Definition[];
	onChange?: (value: any) => void;
}>): ReactNode => {
	const id = useId();

	const [selected, setSelected] = useState<string>('0');
	const [valueStates, setValueStates] = useState<any[]>(Array.from({ length: schemas.length }).fill(null));
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

	return (
		<ul className="grid gap-2">
			{schemas.map((s, i) => (
				<li key={i} className="grid grid-cols-[auto_1fr] gap-2 items-baseline">
					<input
						type="radio"
						// id={id}
						name={id}
						value={i}
						checked={selected === String(i)}
						onChange={e => {
							setSelected(e.currentTarget.value);
							handleChange(i)(valueStates[i]);
						}}
					/>
					<fieldset disabled={selected !== String(i)}>
						<Nested schema={s} depth={depth} value={valueStates[i]} onChange={handleChange(i)} />
					</fieldset>
				</li>
			))}
		</ul>
	);
};

const NestedObject = ({
	value,
	schema,
	depth = 0,
	onChange,
}: Readonly<{
	value: Readonly<Record<string, JsonValue>> | undefined;
	schema: JSONSchema;
	depth?: number;
	onChange?: (value: Readonly<Record<string, JsonValue>> | undefined) => void;
}>): ReactNode => {
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
		return null;
	}
	return (
		<ul className="grid gap-2 pl-4">
			{Object.entries(schema.properties).map(([key, property]) =>
				// @ts-expect-error
				property.deprecated === true ? null : (
					<li key={key} className="flex flex-wrap gap-2">
						<div className="min-w-[5rem]">
							{depth === 0 ? (
								<h4>{key}:</h4>
							) : depth === 1 ? (
								<h5>{key}:</h5>
							) : depth === 2 ? (
								<h6>{key}:</h6>
							) : (
								<dfn>{key}:</dfn>
							)}
						</div>
						<div className="min-w-[10rem]">
							<Nested
								schema={property}
								depth={depth}
								onChange={handleChange(key)}
								value={valueState?.[key]}
							/>
						</div>
					</li>
				),
			)}
		</ul>
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
			className="select-arrow border border-slate-300 rounded-md "
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
			className="border border-slate-300 rounded-md px-1 py-0.5"
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

	if (schema.enum) {
		const defaultValue = schema.default;
		return (
			<select
				className="select-arrow border border-slate-300 rounded-md"
				value={valueState}
				onChange={e => {
					handleChange(e.currentTarget.value);
				}}
			>
				<option value={''}>(unset{defaultValue !== undefined && `: "${defaultValue}"`})</option>
				{schema.enum.map(
					keyword =>
						typeof keyword === 'string' && <option key={keyword} value={keyword}>{`"${keyword}"`}</option>,
				)}
			</select>
		);
	} else {
		return (
			<input
				className="border border-slate-300 rounded-md px-1 py-0.5"
				type="text"
				value={valueState}
				onChange={e => {
					handleChange(e.currentTarget.value);
				}}
			/>
		);
	}
};
