function generateASTFirstPhase(tree, nodeIndices, nodes, isChild) {
  nodeIndices.forEach((nodeIndex) => {
    const node = nodes[nodeIndex];
    const nodeAttributes = node.attributes || {};
    const { isRoot } = node;
    const {
      name,
      alias,
      type,
      constraints,
      possibleValues,
      isOptional,
      http_method,
      http_path,
      commentText,
      arrayChildrenType,
    } = nodeAttributes;
    const isEndpoint = !!(http_method && http_path);
    if (name) {
      tree[name] = {
        alias,
        isRoot,
        isOptional,
        dataType: type,
        constraints,
        possibleValues, // Can make this new Set
        http_method,
        http_path,
        isEndpoint,
        commentText,
        arrayChildrenType,
        spreads: node.spreads,
        children: {},
      };
      if (node.children) {
        generateASTFirstPhase(tree[name].children, node.children, nodes, true);
      }
    }
  });
  return tree;
}
function extractASTPath(path, AST) {
  const pathTokens = path.split('.');
  let pathFound = true;
  let extractedASTPathValue = AST;
  const ptl = pathTokens.length;
  for (let x = 0; x < ptl; x++) {
    const astkey = pathTokens[x];
    if (!AST[astkey]) {
      pathFound = false;
      break;
    } else {
      extractedASTPathValue = extractedASTPathValue[astkey];
    }
  }
  if (!pathFound) throw new Error(`Spread Path ${path} not found in AST`);
  return extractedASTPathValue;
}

function processSpreads(spreads, node, AST) {
  spreads.forEach((spreadPath) => {
    // console.log(node, spreadPath, AST, 'CHECKING');
    // console.log(AST);
    const extractedPathValue = extractASTPath(spreadPath, AST);
    // console.log('ExtractedValue', extractedPathValue);
    node.children = { ...node.children, ...extractedPathValue.children };
  });
}
function fillInSpreadVals(AST, trueAST) {
  const ASTKeys = Object.keys(AST);
  ASTKeys.forEach((astkey) => {
    const astnode = AST[astkey];
    if (astnode?.spreads?.length) {
      processSpreads(astnode.spreads, astnode, trueAST);
    }
    if (Object.keys(astnode.children || {}).length) {
      fillInSpreadVals(astnode.children, trueAST);
    }
  });
}
function generateAST(tree, nodeIndices, nodes, isChild) {
  const ASTInit = generateASTFirstPhase(tree, nodeIndices, nodes, isChild);
  // We need to loop through and attend to things like spread operands before returning final object
  // console.log(ASTInit, '== == == ==');
  fillInSpreadVals(ASTInit, ASTInit);
  return ASTInit;
}
module.exports = generateAST;
