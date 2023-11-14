type Props = Readonly<{
	value: string;
	onChange?: (value: string) => void;
}>;

export const FilenameEditor = ({ value, onChange }: Props) => {
	return (
		<label className="py-2 px-4 grid grid-flow-col gap-1 justify-start items-center">
			Code filename:
			<input
				className="border border-gray-400 rounded-md px-1"
				type="text"
				value={value}
				onChange={e => {
					onChange?.(e.currentTarget.value);
				}}
			/>
		</label>
	);
};
