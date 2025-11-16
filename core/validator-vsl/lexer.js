// attributes: !parentNode?.attributes?.isCommentBlock ? lineProcessor(line) : {
//   lineMatched: true,
//   commentText: line,
//   isCommentText: true,
// }
const lineProcessor = require('./regexes');

function lex(sourceString = '') {
  const lines = sourceString.split('\n');
  const parentMap = [];
  const rootNodes = [];
  const nodes = [];

  lines.forEach((line, index) => {
    const currentParent = parentMap.slice(-1)[0];
    const parentNode = nodes[currentParent];
    const nodeInfo = {
      line,
      parent: currentParent,
      children: [],
      spreads: [],
      index,
      lineNumber: index + 1,
      attributes: lineProcessor(line.trim(), parentNode),
    };
    if (nodeInfo.attributes?.isOpened) {
      parentMap.push(index);
      if (typeof currentParent === 'undefined') {
        rootNodes.push(index);
        nodeInfo.isRoot = true;
      }
    }
    if (nodeInfo.attributes?.isClosed) {
      parentMap.pop();
    }
    nodes.push(nodeInfo);
    if (!nodeInfo.attributes?.isNotChild) {
      parentNode?.children?.push(nodeInfo.index);
    } else if (nodeInfo.attributes?.isSpreadOperator) {
      parentNode?.spreads?.push(nodeInfo.attributes.name);
    }
  });
  // console.log({ nodes, rootNodes });
  return { nodes, rootNodes };
}
module.exports = lex;
// console.log('jk|jk|jk|jk'.match(/(?<WORD>[a-z]+)(?<SECONDARY_WORD>\|[a-z]+)*/))
