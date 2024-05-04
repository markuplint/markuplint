import type { Rules, AnyRule } from '@markuplint/ml-config';
import type { JSONSchema7Definition } from 'json-schema';

import { memo, useCallback, useEffect, useState } from 'react';
import { satisfies } from 'semver';

import { fetchDereferencedSchema, isJSONSchema } from '../modules/json-schema';

import { RuleConfig } from './RuleConfig';

type Props = Readonly<{
	value: Rules;
	version: string;
	onChange: (rules: Rules) => void;
}>;

const RulesSelectorRaw = ({ value, version, onChange }: Props) => {
	const [, setRulesState] = useState<Rules>({});
	const [ruleSchemas, setRuleSchemas] = useState<Record<string, JSONSchema7Definition> | null>(null);

	useEffect(() => {
		setRulesState(value);
	}, [value]);

	useEffect(() => {
		void (async () => {
			setRuleSchemas(null);
			try {
				// get schema
				const url = `https://raw.githubusercontent.com/markuplint/markuplint/v${version}/config.schema.json`;
				const dereferencedSchema = await fetchDereferencedSchema(new URL(url));
				if (!isJSONSchema(dereferencedSchema)) return;

				const rulesDefinition = dereferencedSchema?.properties?.rules;
				if (!isJSONSchema(rulesDefinition)) return;

				if (satisfies(version, '>=4.0.0')) {
					setRuleSchemas(rulesDefinition.properties ?? null);
				} else if (satisfies(version, '>=3.13.0')) {
					const builtinRulesDefinition = rulesDefinition.oneOf?.[0];
					if (!isJSONSchema(builtinRulesDefinition)) return;
					setRuleSchemas(builtinRulesDefinition.properties ?? null);
				} else if (satisfies(version, '>=3.0.0')) {
					setRuleSchemas(rulesDefinition.properties ?? null);
				} else {
					// eslint-disable-next-line no-console
					console.error('Given version is not supported');
				}
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error(error);
			}
		})();
	}, [version]);

	const handleChange = useCallback(
		(ruleName: string, rule: AnyRule) => {
			setRulesState(prev => {
				const writableConfig = { ...prev };
				if (rule == null) {
					delete writableConfig[ruleName];
				} else {
					writableConfig[ruleName] = rule;
				}
				onChange(writableConfig);
				return writableConfig;
			});
		},
		[onChange],
	);

	return (
		<div>
			{ruleSchemas == null ? (
				<p className="p-4">Loading schema...</p>
			) : (
				Object.entries(ruleSchemas).map(
					([key, ruleSchema]) =>
						typeof ruleSchema !== 'boolean' && (
							<RuleConfig
								key={key}
								ruleName={key}
								schema={ruleSchema}
								value={value[key]}
								onChange={handleChange}
							/>
						),
				)
			)}
		</div>
	);
};

export const RulesSelector = memo(RulesSelectorRaw);
