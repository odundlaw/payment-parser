const { h, buildRegexFromComplexString } = require('../utils/regex-builder');

schemaRegexString = h`
^
  (#)?(?<SCHEMA_NAME>[a-zA-Z$_]+[a-zA-Z$_0-9]*)
  (?:\s+as\s+(?<SCHEMA_ALIAS>[a-zA-Z$_]+[a-zA-Z$_0-9]*))?
  \s*
  (?<OPENING_PAREN>{)
  \s*
$
`;
const SchemaIdRegex = buildRegexFromComplexString(schemaRegexString);
function schemaLineProcessor(line = '') {
  let nodeInfo = {};
  const lineMatches = line.match(SchemaIdRegex);
  const lineGroups = lineMatches?.groups;
  const { SCHEMA_NAME, SCHEMA_ALIAS, OPENING_PAREN } = lineGroups || {};
  nodeInfo = {
    lineMatched: !!SCHEMA_NAME,
    name: SCHEMA_NAME,
    alias: SCHEMA_ALIAS,
    isOpened: !!OPENING_PAREN,
  };
  return nodeInfo;
}
// @TODO: This can actually be mixed in with the type-processor since the only difference is the # at the start
module.exports = schemaLineProcessor;
