import * as parse5 from 'parse5';

const doc = parse5.parse(`
<div>Hello world</div>
`, {

});

console.log(doc);
