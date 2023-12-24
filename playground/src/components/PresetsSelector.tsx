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

export const PresetsSelector = ({ fileType, value, onChange }: Props) => {
	const presets = value;
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
			setImplicitPresets(getImplicitPresets(newPresets));
			onChange?.(newPresets);
		},
		[onChange, presets],
	);
	useEffect(() => {
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
			onChange?.(newPresets);
		}
	}, [fileType, onChange, presets]);

	const specificRecommendedPreset = specificRecommendedPresets[fileType];
	return (
		<div className="grid gap-2 px-4 py-4">
			<div className="grid items-center justify-start gap-2">
				{specificRecommendedPreset && (
					<label className="flex items-baseline gap-1">
						<input
							type="checkbox"
							checked={implicitPresets.includes(specificRecommendedPreset)}
							onChange={handleChange}
							value={specificRecommendedPreset}
							className="h-4 w-4 translate-y-1 accent-ml-blue"
						/>
						<code>
							<span className="text-gray-500">markuplint:</span>
							<span className="font-bold">{specificRecommendedPreset.replace('markuplint:', '')}</span>
						</code>
					</label>
				)}
				<div className="grid gap-2 pl-6">
					<label className="flex items-baseline gap-1">
						<input
							type="checkbox"
							checked={implicitPresets.includes('markuplint:recommended')}
							onChange={handleChange}
							value={'markuplint:recommended'}
							className="h-4 w-4 translate-y-1 accent-ml-blue"
							disabled={implicitPresets.some(p => p.startsWith('markuplint:recommended-'))}
						/>
						<code>
							<span className="text-gray-500">markuplint:</span>
							<span className="font-bold">recommended</span>
						</code>
					</label>
					<div className="grid gap-1 pl-6">
						{basePresets.map((presetName, i) => (
							<label key={i} className="flex items-baseline gap-1">
								<input
									type="checkbox"
									checked={implicitPresets.includes(presetName)}
									onChange={handleChange}
									value={presetName}
									className="h-4 w-4 translate-y-1 accent-ml-blue"
									disabled={implicitPresets.includes('markuplint:recommended')}
								/>
								<code>
									<span className="text-gray-500">markuplint:</span>
									<span className="font-bold">{presetName.replace('markuplint:', '')}</span>
								</code>
							</label>
						))}
					</div>
				</div>
			</div>
			<p>
				<a
					href="https://markuplint.dev/docs/guides/presets"
					target="_blank"
					rel="noreferrer"
					className="text-ml-blue underline"
				>
					Learn more about presets
					<span className="icon-majesticons-open ml-1 translate-y-1 overflow-hidden">(Open in new tab)</span>
				</a>
			</p>
		</div>
	);
};
