<script>
	function clickHandler() {
		console.log('clicked!!');
	}

	let foo = 'bar';
</script>

<button type="other-type" on:click={clickHandler}>button</button>

<button invalid-attr>
	<a href="path/to">link</a>
</button>

<textarea bind:value={foo}></textarea>