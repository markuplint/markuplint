import { fileTypes } from '../modules/save-values';

type Props = Readonly<{
	value: string;
	onChange?: (value: string) => void;
}>;

export const FilenameEditor = ({ value, onChange }: Props) => {
	return (
		<label className="py-2 px-4 grid grid-flow-col gap-1 justify-start items-center">
			Code file type:
			<select
				className="border border-gray-400 rounded-md px-1"
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
	);
};
