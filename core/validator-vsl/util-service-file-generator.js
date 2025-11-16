const jsdocGenerator = require('./jsdoc-generator');
const speclGenerator = require('./specl-generator');
const odcGenerator = require('./odc-generator');
const { toKebabCase, writeFileWithDirs } = require('./util-helpers');

function serviceTemplateGen(data) {
  const {
    jsdocString,
    speclString,
    serviceName,
    speclVariable,
    jsdocTypeReference,
    requireStatements,
    modelCreationStatements,
    speclPath,
  } = data;
  return `const validator = require('@app-core/validator');
${requireStatements}

${jsdocString}

${speclString}

// Parse the spec outside the service function
const parsedSpec = validator.parse(${speclVariable});

async function ${serviceName}(serviceData) {
  /** @type {import('${speclPath}').${jsdocTypeReference}} */
  const validatedData = validator.validate(serviceData, parsedSpec);
  // Code in here
${modelCreationStatements}
  return '';
}

module.exports = ${serviceName};
`;
}
function generateServiceFile(AST) {
  let serviceStringTokens = [];
  const serviceCodeStrings = [];
  // const specStrings = [];

  const astKeys = Object.keys(AST);
  astKeys.forEach((astKey) => {
    const astNode = AST[astKey];
    if (astKey.toLowerCase().endsWith('service')) {
      const { accepts, requires, resource, updateQuery, updateValues } = astNode.children;
      if (accepts && requires) {
        const requiredModels = requires.children?.models?.children || {};
        const requireStatements = [];
        const modelCreationStatements = [];
        // const findStatements = [];
        Object.keys(requiredModels).forEach((rm) => {
          const rmObject = requiredModels[rm];
          requireStatements.push(`const ${rm} = require('../../repository/${rmObject.dataType}');`);
          if (rmObject.constraints?.create) {
            modelCreationStatements.push(
              `\tconst created${rm} = await ${rm}.create({...validatedData, created: Date.now(), updated: Date.now()});`
            );
          }
          if (rmObject.constraints?.find) {
            const cardinality = rmObject.constraints?.find.value; // console.log(cardinality);
            const cardinalitySuffix = cardinality === 'many' ? 'Many' : 'One';
            const acceptsObjectKeys = Object.keys(accepts?.children || {}); // console.log(acceptsObjectKeys, accepts)
            modelCreationStatements.push(`  const query = {};`);
            acceptsObjectKeys.forEach((aok) => {
              const aokObj = accepts.children[aok];
              const { isOptional } = aokObj;
              if (isOptional) {
                modelCreationStatements.push(
                  `  if(validatedData.${aok}) query.${aok} = validatedData.${aok};`
                );
              } else {
                modelCreationStatements.push(`  query.${aok} = validatedData.${aok};`);
              }
            });
            modelCreationStatements.push(
              `  const result = await ${rm}.find${cardinalitySuffix}({query});`
            );
          }
          if (rmObject.constraints?.update) {
            const cardinality = rmObject.constraints?.update.value; // console.log(cardinality);
            const cardinalitySuffix = cardinality === 'many' ? 'Many' : 'One';
            const updateQueryObjectKeys = Object.keys(updateQuery?.children || {}); // console.log(updateQueryObjectKeys, accepts)
            modelCreationStatements.push(`  const query = {};`);
            updateQueryObjectKeys.forEach((aok) => {
              const aokObj = updateQuery.children[aok];
              const { isOptional } = aokObj;
              if (isOptional) {
                modelCreationStatements.push(
                  `  if(validatedData.${aok}) query.${aok} = validatedData.${aok};`
                );
              } else {
                modelCreationStatements.push(`  query.${aok} = validatedData.${aok};`);
              }
            });

            const updateValuesObjectKeys = Object.keys(updateValues?.children || {}); // console.log(updateValuesObjectKeys, accepts)
            modelCreationStatements.push(`  const updateValues = {};`);
            updateValuesObjectKeys.forEach((aok) => {
              const aokObj = updateValues.children[aok];
              const { isOptional } = aokObj;
              if (isOptional) {
                modelCreationStatements.push(
                  `  if(validatedData.${aok}) updateValues.${aok} = validatedData.${aok};`
                );
              } else {
                modelCreationStatements.push(`  updateValues.${aok} = validatedData.${aok};`);
              }
            });

            modelCreationStatements.push(
              `  const result = await ${rm}.update${cardinalitySuffix}({query, updateValues});`
            );
          }
        });
        // console.log(accepts, { [astKey]: { ...accepts, isRoot: true } });
        const jsdocString = jsdocGenerator({ [astKey]: { ...accepts, isRoot: true } }, '', AST);
        const speclString = [
          //   speclGenerator(
          //   { [astKey]: { ...accepts, isRoot: true } },
          //   0,
          //   AST,
          // ),
          odcGenerator({ [astKey]: { ...accepts, isRoot: true } }, 0, AST),
        ].join('\n\n');
        const speclPath = `./specs/${toKebabCase(astKey)}-spec`;
        const serviceString = serviceTemplateGen({
          jsdocString: '',
          speclString: `const ${astKey}Spec = require('${speclPath}');`,
          serviceName: astKey,
          speclVariable: `${astKey}Spec`,
          jsdocTypeReference: astKey,
          speclPath,
          requireStatements: requireStatements.join('\n'),
          modelCreationStatements: modelCreationStatements.join('\n'),
        });
        serviceCodeStrings.push({
          astKey,
          speclPath,
          speclVariable: `${astKey}Spec`,
          jsdocTypeReference: astKey,
          serviceString: serviceString.replace(/\n{2,}/g, '\n\n'),
          jsdocString,
          speclString: speclString.replace(`export { ${astKey}Spec }`, ''),
        });
        const baseResourceFolder = resource?.dataType;
        if (!baseResourceFolder) throw new Error('Resource folder required');
        writeFileWithDirs(
          `./services/${baseResourceFolder}/specs/${toKebabCase(astKey)}-spec.js`,
          `${jsdocString}${speclString.replace(
            `export { ${astKey}Spec }`,
            `module.exports = ${astKey}Spec;`
          )}`
        );
        writeFileWithDirs(
          `./services/${baseResourceFolder}/${toKebabCase(astKey)}.js`,
          serviceString.replace(/\n{2,}/g, '\n\n')
        );
        serviceStringTokens = [];
      }
    }
  });
  return serviceCodeStrings;
}
module.exports = generateServiceFile;
