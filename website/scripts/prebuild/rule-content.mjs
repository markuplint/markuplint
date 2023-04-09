/**
 *
 * @param {string} content
 * @param {string} name
 * @param {string} value
 * @param {Object} options
 * @param {string} severity
 * @param {string} [lang]
 * @returns {string} Rewrote content
 */
export function rewriteRuleContent(content, name, value, options, severity, lang) {
  // Replace internal page URL
  content = content.replace(/\(https:\/\/markuplint\.dev\//g, '(/');

  const separator = /\n\n---\n\n/m;
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

function type(value, escape = false) {
  const verticalBar = escape ? ' &#x7C;<wbr /> ' : ' | ';

  if (value.oneOf) {
    return value.oneOf.map(v => type(v, escape)).join(verticalBar);
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
    return value.enum.map(e => `"${e}"`).join(verticalBar);
  }

  if (value.type === 'object') {
    return value._type ?? 'Object';
  }

  return value.type;
}

function code(value, escape = false) {
  const arraySeparator = escape ? ',<wbr />' : ',';

  if (Array.isArray(value)) {
    return '[' + value.map(item => code(item, escape)).join(arraySeparator) + ']';
  }

  if (typeof value === 'string') {
    return `"${value}"`;
  }

  return value;
}

/**
 *
 * @param {Value} value
 * @param {string} [lang]
 * @returns
 */
function valueDoc(value, lang) {
  if (value.enum && value._description) {
    const table = [
      //
      'Value|Default|Description',
      '---|---|---',
    ];

    table.push(
      ...value.enum.map(e => {
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

function optionDoc(name, options, lang) {
  if (!options) {
    return [];
  }

  const props = Object.entries(options.properties).map(([k, v]) => {
    return `"${k}"?: ${type(v)}`;
  });

  const table = Object.entries(options.properties).map(([k, v]) => {
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
