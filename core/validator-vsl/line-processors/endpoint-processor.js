const { h, buildRegexFromComplexString } = require('../utils/regex-builder');

endpointRegexString = h`
^
  \s*
  (?:(?<HTTP_ENDPOINT_NAME>[a-zA-Z$_-]+[a-zA-Z$_0-9-]*)\s+)?
  (?<HTTP_METHOD>(POST|GET|OPTION|DELETE|PATCH|PUT|HEAD))
  \s+
  (?<HTTP_PATH>[a-zA-Z0-9-\/:@$_]+)
  \s*
  (?<OPENING_PAREN>{)?
  (?:
   \s*\/\/\s*(?<COMMENT_TEXT>.+)?
 )?
  \s*
$
`;
const endpointRegex = buildRegexFromComplexString(endpointRegexString);
function endpointRouteLineProcessor(line = '') {
  let nodeInfo = {};
  const lineMatches = line.match(endpointRegex);
  const lineGroups = lineMatches?.groups;
  const { HTTP_METHOD, HTTP_PATH, OPENING_PAREN, HTTP_ENDPOINT_NAME, COMMENT_TEXT } =
    lineGroups || {};
  nodeInfo = {
    lineMatched: !!HTTP_METHOD,
    http_method: HTTP_METHOD,
    name: HTTP_ENDPOINT_NAME,
    http_path: HTTP_PATH,
    isOpened: !!OPENING_PAREN,
    commentText: COMMENT_TEXT,
  };
  return nodeInfo;
}
module.exports = endpointRouteLineProcessor;
