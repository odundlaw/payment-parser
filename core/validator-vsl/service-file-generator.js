const jsdocGenerator = require('./jsdoc-generator');
const speclGenerator = require('./specl-generator');

function serviceTemplateGen(data) {
  const { jsdocString, speclString, serviceName, speclVariable, jsdocTypeReference } = data;
  return `const validator = require('@app-core/validator');

${jsdocString}

${speclString}

// Parse the spec outside the service function
const parsedSpec = validator.parse(${speclVariable});

async function ${serviceName}(serviceData) {
  /** @type {${jsdocTypeReference}} */
  const validatedData = validator.validate(serviceData, parsedSpec);
  // Code in here
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
      const jsdocString = jsdocGenerator({ [astKey]: astNode }, '', AST);
      const speclString = speclGenerator({ [astKey]: astNode }, 0, AST);
      const serviceString = serviceTemplateGen({
        jsdocString,
        speclString: speclString.replace(`export { ${astKey}Spec }`, ''),
        serviceName: astKey,
        speclVariable: `${astKey}Spec`,
        jsdocTypeReference: astKey,
      });
      serviceStringTokens.push(serviceString.replace(/\n{2,}/g, '\n\n'));
    }
  });
  return serviceStringTokens.join('\n');
}
module.exports = generateServiceFile;
