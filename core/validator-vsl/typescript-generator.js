function getReferencedTypeFromAST(type, AST) {
  const t = type.replace(/[$#]/g, '');
  const [parent, key] = t.split('.');
  // console.log(parent, key);
  let referencedType;
  if (parent && key) {
    const astReferenceObject = AST[parent]?.children?.[key];

    if (astReferenceObject?.dataType) {
      referencedType = astReferenceObject?.dataType;
    } else if (astReferenceObject) {
      referencedType = astReferenceObject;
    }
  } else if (parent) {
    const astReferenceObject = AST[parent];
    // console.log(astReferenceObject, type, Object.keys(AST));
    referencedType = astReferenceObject;
  }
  // if (!referencedType) throw new Error('Referenced type not found');
  // console.log(referencedType, AST);
  return referencedType;
}
function generateTypeScriptType(AST, tabIndexCount = 0, trueAST) {
  const typeScriptStringTokens = [];
  const keys = Object.keys(AST);
  let typeBlockOpened = false;
  keys.forEach((k) => {
    const node = AST[k];
    if (node?.dataType?.includes('#')) {
      const astReferenceObject = getReferencedTypeFromAST(node.dataType, trueAST);
      if (typeof astReferenceObject === 'object') {
        // node = astReferenceObject; //this style uses the entire reference, but do we only want the children? Todl as a review
        node.children = astReferenceObject.children;
        AST[k] = node;
        // console.log(k, AST[k]);
      }
    }
    const {
      isOptional,
      isRoot,
      dataType,
      http_method,
      http_path,
      commentText,
      possibleValues,
      arrayChildrenType,
    } = node;
    const nodeHasChildren = Object.keys(node.children || {}).length;
    const shouldOpenNewBlock = isRoot || nodeHasChildren;
    const tabs = new Array(tabIndexCount).fill('\t').join('');
    if (shouldOpenNewBlock) {
      const declarationSuffix = isRoot ? 'type ' : '';
      const equalitySuffix = isRoot ? ' = ' : ': ';
      const optionalSuffix = !isRoot && isOptional ? '?' : '';
      const indentationPrefix = !isRoot ? tabs : '';
      if (commentText) {
        typeScriptStringTokens.push(`${indentationPrefix}/** ${commentText} */`);
      }
      typeScriptStringTokens.push(
        `${indentationPrefix}${declarationSuffix}${k}${optionalSuffix}${equalitySuffix}{`
      );
      typeBlockOpened = true;
      if (http_method && http_path) {
        const inlineTabs = new Array(tabIndexCount + 1).fill('\t').join('');
        typeScriptStringTokens.push(`${inlineTabs}HTTP_METHOD:'${http_method}';`);
        typeScriptStringTokens.push(`${inlineTabs}HTTP_PATH:'${http_path}';`);
      }
    } else {
      let dataTypeToRender = dataType; // .replace('#', '').replace('.', "['");
      if (dataTypeToRender.includes('#')) {
        dataTypeToRender = getReferencedTypeFromAST(dataType, trueAST);
      }
      const optionalSuffix = isOptional ? '?' : '';
      if (commentText) {
        typeScriptStringTokens.push(`${tabs}/** ${commentText} */`);
      }
      const arrayOpeningPrefix = dataTypeToRender === 'array' ? '[' : '';
      const arrayClosingSuffix = dataTypeToRender === 'array' ? ']' : '';
      if (dataTypeToRender === 'array') {
        dataTypeToRender = arrayChildrenType;
      }
      if (possibleValues?.length) {
        dataTypeToRender = possibleValues.map((pv) => `"${pv}"`).join(' | ');
      }
      typeScriptStringTokens.push(
        `${tabs}${k}${optionalSuffix}: ${arrayOpeningPrefix}${
          dataTypeToRender || 'any'
        }${arrayClosingSuffix};`
      );
    }
    if (nodeHasChildren) {
      typeScriptStringTokens.push(
        generateTypeScriptType(node.children, tabIndexCount + 1, trueAST)
      );
    }

    if (typeBlockOpened) {
      // const terminationSuffix = isRoot ? ' = ' : ': ';
      const indentationPrefix = !isRoot ? tabs : '';
      typeScriptStringTokens.push(`${indentationPrefix}};`);
      if (isRoot) {
        typeScriptStringTokens.push(`\nexport { ${k} };\n\n`);
      }
    }
  });

  return typeScriptStringTokens.join('\n');
}
module.exports = generateTypeScriptType;
