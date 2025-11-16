const typeScriptGenerator = require('./util-typescript-generator');
const markdownPropertyGenerator = require('./markdown-properties-generator');
const jsonGenerator = require('./util-json-generator');
const { toKebabCase, writeFileWithDirs } = require('./util-helpers');

function writeSectionMd(sectionName, sectionKeyName, sectionData, AST) {
  const strings = [];
  if (Object.keys(sectionData || {}).length) {
    strings.push(`## ${sectionName}`);
    strings.push(
      markdownPropertyGenerator({ [sectionKeyName]: { ...sectionData, isRoot: true } }, '', AST)
    );
    strings.push(`\n\n`);
    strings.push(`## ${sectionName} Type`);
    strings.push('```typescript');
    strings.push(
      typeScriptGenerator({ [sectionKeyName]: { ...sectionData, isRoot: true } }, 0, AST).replace(
        `\nexport { ${sectionKeyName} };\n\n`,
        ''
      )
    );
    strings.push('```');
    strings.push(`\n\n`);
    strings.push(`## ${sectionName} JSON Example`);
    strings.push('```json');
    strings.push(jsonGenerator({ [sectionKeyName]: { ...sectionData, isRoot: true } }, 0, AST));
    strings.push('```');
  }
  return strings;
}

function generateServiceFile(AST) {
  let endpointStringTokens = [];
  const astKeys = Object.keys(AST);
  astKeys.forEach((astKey) => {
    const astNode = AST[astKey];
    if (astNode.isEndpoint) {
      const { http_method, http_path, commentText } = astNode;
      const { headers, body, params, query, resource, response } = astNode.children;
      endpointStringTokens.push(`# ${astKey} Endpoint Documentation`);
      if (commentText) {
        endpointStringTokens.push(`${commentText}\n\n`);
      }
      endpointStringTokens.push('```');
      endpointStringTokens.push(`HTTP ${http_method} {baseurl}${http_path}`);
      endpointStringTokens.push('```\n\n');

      endpointStringTokens.push(...writeSectionMd('Headers', 'headers', headers, AST));
      endpointStringTokens.push(...writeSectionMd('Query', 'query', query, AST));
      endpointStringTokens.push(...writeSectionMd('Params', 'params', params, AST));
      endpointStringTokens.push(...writeSectionMd('Body', 'body', body, AST));
      endpointStringTokens.push(...writeSectionMd('Response', 'response', response, AST));

      const epString = endpointStringTokens.join('\n');
      const baseResourceFolder = resource?.dataType;
      if (!baseResourceFolder) throw new Error('Resource folder required');
      writeFileWithDirs(`./docs/${baseResourceFolder}/${toKebabCase(astKey)}.md`, epString);
      endpointStringTokens = [];
    }
  });
  return true;
}
module.exports = generateServiceFile;
