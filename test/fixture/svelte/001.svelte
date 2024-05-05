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

<select bind:value={foo}>
	<option value="1">1</option>
	<option value="2">2</option>
</select>
<textarea bind:value={foo}></textarea>