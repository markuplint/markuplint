/**
 * @returns {string} Rewrote content
 */
export function rewriteRuleContent(
  content: string,
  name: string,
  value: string,
  options: object,
  severity: string,
  lang?: string,
): string {
  // Replace internal page URL
  content = content.replaceAll('(https://markuplint.dev/', '(/');

  const separator = /\n\n---\n\n/;
  const target = content.search(separator) === -1 ? /$/ : separator;

  content = content.replace(
    target,
    [
      '\n\n',
      '## Interface',
      '```ts',
      '{',
      `  "${name}": ${type(value)}`,
      '}',
      '```',
      ...valueDoc(value, lang),
      ...optionDoc(name, options, lang),
      '## Default Severity',
      `\`${severity}\``,
      '\n',
    ].join('\n'),
  );

  // Replace relative paths
  content = content.replaceAll('](../', '](./');

  return content;
}

function type(value: any, escape = false): string {
  const verticalBar = escape ? ' &#x7C;<wbr /> ' : ' | ';

  if (value.oneOf) {
    return value.oneOf.map((v: any) => type(v, escape)).join(verticalBar);
  }

  if (value.type === 'array') {
    const needWrap = !!value.items.enum || !!value.items.oneOf;
    return (
      (needWrap ? '(' : '') +
      // Recursive
      type(value.items, escape) +
      (needWrap ? ')' : '') +
      '[]'
    );
  }

  if (value.type === 'string' && value.enum) {
    return value.enum.map((e: string) => `"${e}"`).join(verticalBar);
  }

  if (value.type === 'object') {
    if (typeof value._type === 'string') {
      return value._type.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    }
    return value._type ?? 'Object';
  }

  return value.type;
}

function code(value: any, escape = false): string {
  const arraySeparator = escape ? ',<wbr />' : ',';

  if (Array.isArray(value)) {
    return '[' + value.map((item: any) => code(item, escape)).join(arraySeparator) + ']';
  }

  if (typeof value === 'string') {
    return `"${value}"`;
  }

  return value;
}

function valueDoc(value: any, lang?: string): string[] {
  if (value.enum && value._description) {
    const table = [
      //
      'Value|Default|Description',
      '---|---|---',
    ];

    table.push(
      ...value.enum.map((e: string) => {
        const desc = value[`_description:${lang}`]?.[e] ?? value._description[e];
        return `\`"${e}"\`|${value.default === e ? '✓' : ''}|${desc}`;
      }),
    );

    return table;
  }

  const desc = value[`description:${lang}`] ?? value.description;

  if (desc) {
    return [desc];
  }

  return [];
}

function optionDoc(name: string, options: any, lang?: string): string[] {
  if (!options) {
    return [];
  }

  const props = Object.entries(options.properties).map(([k, v]) => {
    return `"${k}"?: ${type(v)}`;
  });

  const table = Object.entries(options.properties).map(([k, v]: readonly [string, any]) => {
    const desc = v[`description:${lang}`] ?? v.description;
    return `\`${k}\`|<code>${type(v, true)}</code>|<code>${code(v.default, true)}</code>|${desc}`;
  });

  const additionalDescription = options[`description:${lang}`] ?? options.description ?? '';

  return [
    //
    '',
    '### Options',
    '',
    '```ts',
    '{',
    `  "${name}": {`,
    '    "options": {',
    ...props.map(prop => `      ${prop}`),
    '    }',
    '  }',
    '}',
    '```',
    '',
    additionalDescription,
    '',
    'Property|Type|Default Value|Description',
    '---|---|---|---',
    ...table,
  ];
}
