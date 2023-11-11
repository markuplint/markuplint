import { forwardRef, useImperativeHandle, useState } from 'react';

export type FilenameEditorRef = {
	getFilename: () => string;
	setFilename: (filename: string) => void;
};

type Props = {
	onChangeFilename?: (filename: string) => void;
};

export const FilenameEditor = forwardRef<FilenameEditorRef, Props>(({ onChangeFilename }, ref) => {
	const [filenameState, setFilenameState] = useState<string>('code.html');

	useImperativeHandle(
		ref,
		() => {
			return {
				getFilename: () => {
					return filenameState;
				},
				setFilename: (filename: string) => {
					setFilenameState(filename);
				},
			};
		},
		[filenameState],
	);

	return (
		<label className="py-2 px-4 grid grid-flow-col gap-1 justify-start items-center">
			Code filename:
			<input
				className="border border-gray-400 rounded-md px-1"
				type="text"
				value={filenameState}
				onChange={e => {
					setFilenameState(e.currentTarget.value);
					onChangeFilename?.(e.currentTarget.value);
				}}
			/>
		</label>
	);
});
