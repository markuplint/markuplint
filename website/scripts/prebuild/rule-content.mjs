/**
 *
 * @param {string} content
 * @param {string} name
 * @param {string} value
 * @param {Object} options
 * @param {string} severity
 * @returns {string} Rewrote content
 */
export function rewriteRuleContent(content, name, value, options, severity) {
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
      ...valueDoc(value),
      ...optionDoc(name, options),
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
  const verticalBar = escape ? '&#x7C;' : '|';

  if (value.oneOf) {
    return value.oneOf.map(v => type(v, escape)).join(verticalBar);
  }

  if (value.type === 'array') {
    return type(value.items, escape) + '[]';
  }

  if (value.type === 'string' && value.enum) {
    return value.enum.map(e => `"${e}"`).join(verticalBar);
  }

  if (value.type === 'object' && value._type) {
    return value._type;
  }

  return value.type;
}

function valueDoc(value) {
  if (value.enum && value._description) {
    const table = [
      //
      'Value|Default|Description',
      '---|---|---',
    ];

    table.push(
      ...value.enum.map(e => {
        const desc = value._description[e];
        return `\`"${e}"\`|${value.default === e ? '✓' : ''}|${desc}`;
      }),
    );

    return table;
  }

  if (value.description) {
    return [value.description];
  }

  return [];
}

function optionDoc(name, option) {
  if (!option) {
    return [];
  }

  const props = Object.entries(option.properties).map(([k, v]) => {
    return `"${k}"?: ${type(v)}`;
  });

  const table = Object.entries(option.properties).map(([k, v]) => {
    return `\`${k}\`|<code>${type(v, true)}</code>|\`${v.default}\`|${v.description}`;
  });

  return [
    //
    '### Options',
    '```ts',
    '{',
    `  "${name}": {`,
    '    "option": {',
    ...props.map(prop => `      ${prop}`),
    '    }',
    '  }',
    '}',
    '```',
    'Property|Type|Default Value|Description',
    '---|---|---|---',
    ...table,
  ];
}
