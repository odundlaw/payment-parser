const jsdocGenerator = require('./jsdoc-generator');
const speclGenerator = require('./specl-generator');

function serviceTemplateGen(data) {
  const {
    jsdocString,
    speclString,
    serviceName,
    speclVariable,
    jsdocTypeReference,
    requireStatements,
    modelCreationStatements,
  } = data;
  return `const validator = require('@app-core/validator');
${requireStatements}

${jsdocString}

${speclString}

// Parse the spec outside the service function
const parsedSpec = validator.parse(${speclVariable});

async function ${serviceName}(serviceData) {
  /** @type {${jsdocTypeReference}} */
  const validatedData = validator.validate(serviceData, parsedSpec);
  // Code in here
  ${modelCreationStatements}
  return '';
}

module.exports = ${serviceName};
`;
}
function generateServiceFile(AST) {
  const serviceStringTokens = [];
  const astKeys = Object.keys(AST);
  astKeys.forEach((astKey) => {
    const astNode = AST[astKey];
    if (astKey.toLowerCase().endsWith('service')) {
      const { accepts, requires } = astNode.children;
      if (accepts && requires) {
        const requiredModels = requires.children?.models?.children;
        const requireStatements = [];
        const modelCreationStatements = [];
        Object.keys(requiredModels).forEach((rm) => {
          const rmObject = requiredModels[rm];
          requireStatements.push(`const ${rm} = require('../repositories/${rmObject.dataType}');`);
          if (rmObject.constraints?.create) {
            modelCreationStatements.push(
              `const created${rm} = await ${rm}.create({...validatedData, created: Date.now(), updated: Date.now()});`
            );
          }
        });
        // console.log(accepts, { [astKey]: { ...accepts, isRoot: true } });
        const jsdocString = jsdocGenerator({ [astKey]: { ...accepts, isRoot: true } }, '', AST);
        const speclString = speclGenerator({ [astKey]: { ...accepts, isRoot: true } }, 0, AST);
        const serviceString = serviceTemplateGen({
          jsdocString,
          speclString: speclString.replace(`export { ${astKey}Spec }`, ''),
          serviceName: astKey,
          speclVariable: `${astKey}Spec`,
          jsdocTypeReference: astKey,
          requireStatements: requireStatements.join('\n'),
          modelCreationStatements: modelCreationStatements.join('\n'),
        });
        serviceStringTokens.push(serviceString.replace(/\n{2,}/g, '\n\n'));
      }
    }
  });
  return serviceStringTokens.join('\n');
}
module.exports = generateServiceFile;
