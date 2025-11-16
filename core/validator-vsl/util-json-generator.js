const { toKebabCase, writeFileWithDirs } = require('./util-helpers');

function getRandomDataType(type, possibleValues, constraints) {
  let retVal = '""';
  const exampleValue = constraints?.example?.value;
  if (typeof exampleValue !== 'undefined') {
    retVal = type === 'string' ? `"${exampleValue}"` : exampleValue;
  } else if (possibleValues?.length) {
    retVal = `"${possibleValues[0]}"`;
  } else if (type === 'string') {
    retVal = '"string"';
  } else if (type === 'number') {
    retVal = 10;
  } else if (type === 'object') {
    retVal = '{}';
  }

  return retVal;
}
function getReferencedTypeFromAST(type, AST) {
  const t = type.replace(/[$#]/g, '');
  const [parent, key] = t.split('.');
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
    referencedType = astReferenceObject;
  }
  return referencedType;
}
function generateTypeScriptType(AST, tabIndexCount = 0, trueAST) {
  const typeScriptStringTokens = [];
  const keys = Object.keys(AST);
  keys.forEach((k) => {
    let typeBlockOpened = false;
    const node = AST[k];
    if (node?.dataType?.includes('#')) {
      const astReferenceObject = getReferencedTypeFromAST(node.dataType, trueAST);
      if (typeof astReferenceObject === 'object') {
        node.children = astReferenceObject.children;
        AST[k] = node;
      }
    } else if (node?.dataType === 'array' && node?.arrayChildrenType?.includes('#')) {
      const astReferenceObject = getReferencedTypeFromAST(node.arrayChildrenType, trueAST);
      // console.log(astReferenceObject);
      if (typeof astReferenceObject === 'object') {
        node.children = astReferenceObject.children;
        AST[k] = node;
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
      constraints,
    } = node;
    const nodeHasChildren = Object.keys(node.children || {}).length;
    const shouldOpenNewBlock = isRoot || nodeHasChildren;
    const tabs = new Array(tabIndexCount).fill('  ').join('');
    if (shouldOpenNewBlock) {
      const declarationSuffix = isRoot ? '{\n  ' : '';
      const equalitySuffix = isRoot ? ' : ' : ': ';
      const optionalSuffix = !isRoot && isOptional ? '' : '';
      const indentationPrefix = !isRoot ? tabs : '';
      const arrayOpeningPrefix = dataType === 'array' ? '[' : '';
      // if (commentText) {
      //   typeScriptStringTokens.push(
      //     `${indentationPrefix}// ${commentText}`,
      //   );
      // }
      if (!isRoot) {
        typeScriptStringTokens.push(
          `${indentationPrefix}${declarationSuffix}"${k}"${optionalSuffix}${equalitySuffix}${arrayOpeningPrefix}{`
        );
      } else {
        typeScriptStringTokens.push(`${indentationPrefix}${arrayOpeningPrefix}{`);
      }
      typeBlockOpened = true;
      if (http_method && http_path) {
        const inlineTabs = new Array(tabIndexCount + 1).fill('  ').join('');
        typeScriptStringTokens.push(`${inlineTabs}HTTP_METHOD:'${http_method}',`);
        typeScriptStringTokens.push(`${inlineTabs}HTTP_PATH:'${http_path}',`);
      }
    } else {
      let dataTypeToRender = dataType;
      if (dataTypeToRender.includes('#')) {
        dataTypeToRender = getReferencedTypeFromAST(dataType, trueAST);
      }
      const optionalSuffix = isOptional ? '' : '';
      // if (commentText) {
      //   typeScriptStringTokens.push(`${tabs}/** ${commentText} */`);
      // }
      const arrayOpeningPrefix = dataTypeToRender === 'array' ? '[' : '';
      const arrayClosingSuffix = dataTypeToRender === 'array' ? ']' : '';
      if (dataTypeToRender === 'array') {
        dataTypeToRender = arrayChildrenType;
      }
      // if (possibleValues?.length) {
      //   dataTypeToRender = possibleValues.map((pv) => `"${pv}"`).join(' | ');
      // }
      typeScriptStringTokens.push(
        `${tabs}"${k}"${optionalSuffix}: ${arrayOpeningPrefix}${
          getRandomDataType(dataTypeToRender, possibleValues, constraints) || 'any'
        }${arrayClosingSuffix},`
      );
    }
    if (nodeHasChildren) {
      typeScriptStringTokens.push(
        generateTypeScriptType(node.children, tabIndexCount + 1, trueAST)
      );
    }
    if (typeBlockOpened) {
      const arrayClosingSuffix = dataType === 'array' ? ']' : '';
      const indentationPrefix = !isRoot ? tabs : '';
      const terminationSuffix = isRoot ? '' : ',';
      const spacing = isRoot ? '  ' : '';
      typeScriptStringTokens.push(
        `${indentationPrefix}${spacing}}${arrayClosingSuffix}${terminationSuffix}`
      );
      if (isRoot) {
        // typeScriptStringTokens.push(`\nexport { ${k} };\n\n`);
        // writeFileWithDirs('./utype.ts', typeScriptStringTokens.join('\n'));
        // generatedTypes.push(typeScriptStringTokens.join('\n'));
        // typeScriptStringTokens = [];
        const lastLine = typeScriptStringTokens[typeScriptStringTokens.length - 1];
        typeScriptStringTokens[typeScriptStringTokens.length - 1] = lastLine.replace(/\s+/g, '');
      }
    }
  });

  return typeScriptStringTokens.join('\n');
}
module.exports = generateTypeScriptType;
