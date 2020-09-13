import MonacoEditor from './MonacoEditor';

export default function Playground() {
	return (
		<>
			<MonacoEditor />
			<style jsx>{`
				div {
					height: auto;
				}
			`}</style>
		</>
	);
}
