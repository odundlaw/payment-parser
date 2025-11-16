// const jsdocGenerator = require('./jsdoc-generator');
const fs = require('fs');
const mongooseGenerator = require('./mongoose-schema-generator');
const typeScriptGenerator = require('./util-typescript-generator');
const { toKebabCase, writeFileWithDirs } = require('./util-helpers');

function updateIndexJs(fileName, variableName) {
  try {
    const indexFileContent = fs.readFileSync('./models/index.js', {
      encoding: 'utf-8',
    });
    if (!indexFileContent.includes(`${variableName},`)) {
      const newIndexFileContent = indexFileContent
        .replace(
          '// #spcl:require',
          `const ${variableName} = require('./${fileName}');\n// #spcl:require`
        )
        .replace('// #spcl:export', `${variableName},\n\t// #spcl:export`);
      fs.writeFileSync('./models/index.js', newIndexFileContent, {
        encoding: 'utf-8',
      });
    }
  } catch (e) {
    console.log(e);
  }
}

function generateServiceFile(AST, config) {
  // let serviceStringTokens = [];
  const serviceCodeStrings = [];
  // const specStrings = [];

  const { generateModelTypes } = config || {};
  const astKeys = Object.keys(AST);
  astKeys.forEach((astKey) => {
    const astNode = AST[astKey];
    if (astKey.toLowerCase().endsWith('model')) {
      const adhocAST = { [astKey]: astNode };
      const modelString = mongooseGenerator(adhocAST, 0, AST);
      writeFileWithDirs(`./models/${toKebabCase(astKey).replace('-model', '')}.js`, modelString);
      updateIndexJs(`${toKebabCase(astKey).replace('-model', '')}`, astKey);
      writeFileWithDirs(
        `./repository/${toKebabCase(astKey).replace('-model', '')}/index.js`,
        `const repositoryFactory = require('../../core/repository-factory');\nmodule.exports = repositoryFactory('${astKey}', {});\n`
      );
      if (generateModelTypes) {
        const typescriptString = typeScriptGenerator(
          { [astKey]: { ...astNode, isRoot: true } },
          0,
          AST
        );
        writeFileWithDirs(
          `./models/types/${toKebabCase(astKey).replace('-model', '')}-type.ts`,
          typescriptString
        );
      }
    }
  });
  return serviceCodeStrings;
}
module.exports = generateServiceFile;
