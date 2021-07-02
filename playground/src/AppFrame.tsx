import { memo } from 'react';
import { Frame } from './Frame';
import { useRange } from './useRange';

export const AppFrame = memo<{
	header: JSX.Element;
	config: JSX.Element;
	editor: JSX.Element;
	logger: JSX.Element;
	footer: JSX.Element;
}>(({ header, config, editor, logger, footer }) => {
	const [configWidth, setConfigWidth] = useRange(30, 5, 95);
	const [loggerHeight, setLoggerHeight] = useRange(20, 5, 95);

	return (
		<div
			className="grid"
			style={{
				height: '100vh',
				gridTemplateAreas: '"header header" "config editor" "config logger" "footer footer"',
				gridTemplateColumns: `${configWidth}% 1fr`,
				gridTemplateRows: `auto 1fr ${loggerHeight}% auto`,
			}}
		>
			<header className="contents">
				<Frame name="header" z={100}>
					{header}
				</Frame>
			</header>
			<main className="contents">
				<Frame
					name="config"
					z={0}
					scrollable
					splitter="e"
					value={configWidth}
					onChange={v => {
						setConfigWidth(v);
					}}
				>
					{config}
				</Frame>
				<Frame name="editor" z={10} fit>
					{editor}
				</Frame>
				<Frame
					name="logger"
					z={0}
					scrollable
					splitter="n"
					value={loggerHeight}
					onChange={v => {
						setLoggerHeight(v);
					}}
				>
					{logger}
				</Frame>
			</main>
			<footer className="contents">
				<Frame name="footer" z={100}>
					{footer}
				</Frame>
			</footer>
		</div>
	);
});
