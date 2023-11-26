import { fileTypes } from '../modules/save-values';

type Props = Readonly<{
	value: string;
	onChange?: (value: string) => void;
}>;

export const FilenameEditor = ({ value, onChange }: Props) => {
	return (
		<div className="py-2 px-4">
			<label className="grid grid-flow-col gap-1 justify-start items-center">
				Code file type:
				<select
					className="select-arrow border border-slate-300 rounded-md"
					value={value}
					onChange={e => {
						onChange?.(e.currentTarget.value);
					}}
				>
					{fileTypes.map(type => (
						<option key={type} value={type}>
							{type}
						</option>
					))}
				</select>
			</label>
			<p className="mt-2">
				<a
					href="https://markuplint.dev/docs/guides/besides-html"
					target="_blank"
					rel="noreferrer"
					className="text-ml-blue underline"
				>
					Learn more about using to besides HTML
					<span className=" icon-majesticons-open ml-1"></span>
					<span className=" icon-heroicons-arrow-top-right-on-square ml-1"></span>
				</a>
			</p>
		</div>
	);
};
