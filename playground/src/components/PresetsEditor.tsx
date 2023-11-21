import type { ChangeEvent } from 'react';

import { useCallback, useEffect, useState } from 'react';

const specificRecommendedPresets: Readonly<{ [key: string]: string | undefined }> = {
	'.html': 'markuplint:recommended-static-html',
	'.jsx': 'markuplint:recommended-react',
	'.vue': 'markuplint:recommended-vue',
	'.svelte': 'markuplint:recommended-svelte',
};

const basePresets = [
	'markuplint:html-standard',
	'markuplint:a11y',
	'markuplint:performance',
	'markuplint:security',
	'markuplint:rdfa',
] as const;

const getImplicitPresets = (explicitPresets: readonly string[]) => {
	if (explicitPresets.some(p => p.startsWith('markuplint:recommended-'))) {
		return [...new Set([...basePresets, 'markuplint:recommended', ...explicitPresets])];
	} else if (explicitPresets.includes('markuplint:recommended')) {
		return [...new Set([...basePresets, 'markuplint:recommended'])];
	} else {
		return [...new Set(explicitPresets)];
	}
};
type Props = Readonly<{
	fileType: string;
	value: readonly string[];
	onChange?: (value: readonly string[]) => void;
}>;

export const PresetsEditor = ({ fileType, value, onChange }: Props) => {
	const [presets, setPresets] = useState<readonly string[]>([]);
	const [implicitPresets, setImplicitPresets] = useState<readonly string[]>([]);
	const handleChange = useCallback(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		(e: Readonly<ChangeEvent<HTMLInputElement>>) => {
			const { checked, value } = e.currentTarget;
			let newPresets: readonly string[];
			if (checked) {
				if (value.startsWith('markuplint:recommended-')) {
					newPresets = [
						...presets.filter(p => !basePresets.includes(p) && !(p === 'markuplint:recommended')),
						value,
					];
				} else if (value === 'markuplint:recommended') {
					newPresets = [...presets.filter(p => !basePresets.includes(p)), value];
				} else {
					newPresets = [...presets, value];
				}
			} else {
				newPresets = presets.filter(p => p !== value);
			}
			setPresets(newPresets);
			setImplicitPresets(getImplicitPresets(newPresets));
			onChange?.(newPresets);
		},
		[onChange, presets],
	);
	useEffect(() => {
		setPresets(value);
		setImplicitPresets(getImplicitPresets(value));
	}, [value]);

	useEffect(() => {
		if (
			presets.some(
				p =>
					Object.values(specificRecommendedPresets).includes(p) && p !== specificRecommendedPresets[fileType],
			)
		) {
			const newPresets = presets.filter(p => !Object.values(specificRecommendedPresets).includes(p));
			setPresets(newPresets);
			onChange?.(newPresets);
		}
	}, [fileType, onChange, presets]);

	const specificRecommendedPreset = specificRecommendedPresets[fileType];
	return (
		<div className="py-2 px-4 grid gap-1 justify-start items-center">
			{specificRecommendedPreset && (
				<label>
					<input
						type="checkbox"
						checked={implicitPresets.includes(specificRecommendedPreset)}
						onChange={handleChange}
						value={specificRecommendedPreset}
					/>
					<span className="text-gray-400">markuplint:</span>
					{specificRecommendedPreset.replace('markuplint:', '')}
				</label>
			)}
			<div className="grid gap-1 pl-4">
				<label>
					<input
						type="checkbox"
						checked={implicitPresets.includes('markuplint:recommended')}
						onChange={handleChange}
						value={'markuplint:recommended'}
						disabled={implicitPresets.some(p => p.startsWith('markuplint:recommended-'))}
					/>
					<span className="text-gray-400">markuplint:</span>recommended
				</label>
				<div className="grid gap-1 pl-4">
					{basePresets.map((presetName, i) => (
						<label key={i} className="flex align-baseline gap-1">
							<input
								type="checkbox"
								checked={implicitPresets.includes(presetName)}
								onChange={handleChange}
								value={presetName}
								disabled={implicitPresets.includes('markuplint:recommended')}
							/>
							<span className="text-gray-400">markuplint:</span>
							{presetName.replace('markuplint:', '')}
						</label>
					))}
				</div>
			</div>
		</div>
	);
};
