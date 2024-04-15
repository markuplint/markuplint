const NodeA = () => {
	return (
		<div class="AReturned" aria-xxx={xxx} aria-yyy>
			foo
		</div>
	);
};

<NoReturned />;

const NodeB = () => {
	return <BReturns {...attr} />;
};

const NodeC = () => {
	return (
		<>
			<CReturns>
				<span>text</span>
			</CReturns>
		</>
	);
};

const NodeD = () => <DReturns />;

const NodeE = () => (
	<>
		<EReturns />
	</>
);

function NodeF() {
	const foo = 0;
	return <FReturns />;
}

export function NodeG() {
	return <GReturns />;
}

export default function NodeH() {
	return <HReturns />;
}

function NodeI() {
	return (
		<Foo.Provider>
			<IReturns />;
		</Foo.Provider>
	);
}

/**
 * @pretends null
 */
function NodeNever() {
	const foo = 0;
	return <NoReturned />;
}
