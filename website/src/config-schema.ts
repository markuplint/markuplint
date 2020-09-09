// @ts-ignore
import configSchema from '../../config.schema.json';
import { dereference } from 'json-schema-ref-parser';

export { JSONSchema } from 'json-schema-ref-parser';

export default async function () {
	const schema = await dereference(configSchema as any);
	return schema;
}
