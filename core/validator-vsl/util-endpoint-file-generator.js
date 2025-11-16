const jsdocGenerator = require('./jsdoc-generator');
const { toKebabCase, writeFileWithDirs } = require('./util-helpers');

function serviceTemplateGen(data) {
  const {
    jsdocString,
    jsdocTypeReference,
    payloadString,
    httpPath,
    httpMethod,
    middlewares,
    middlewareRequireStatement,
    destructureString,
    payloadUserAugmentString,
    serviceFuncDeclration,
  } = data;
  return `const { createHandler } = require('@app-core/server');
${middlewareRequireStatement}
${serviceFuncDeclration}
${jsdocString}


module.exports = createHandler({
  path: '${httpPath}',
  method: '${httpMethod.toLowerCase()}',
  middlewares: [${middlewares}],
  async handler(rc, helpers) {

    ${destructureString}
    const payload = ${payloadString};
    ${payloadUserAugmentString}
    const serviceResult = await serviceFunc(payload);

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      data: serviceResult,
    };
  },
});
`;
}
function generateServiceFile(AST) {
  const endpointStringTokens = [];
  const astKeys = Object.keys(AST);
  astKeys.forEach((astKey) => {
    const astNode = AST[astKey];
    if (astNode.isEndpoint) {
      const { resource, service } = astNode.children;
      const baseResourceFolder = resource?.dataType;
      if (!baseResourceFolder) throw new Error('Resource folder required');
      const jsdocString = jsdocGenerator({ [astKey]: astNode }, '', AST);
      // console.log(astNode)
      let middlewareRequireStatement = '';
      const astMiddlewares = astNode.children?.middlewares?.children || {};
      const astPayloadAuguments = astNode.children?.payloadAuguments?.children || {};
      const rcUserAuguments = Object.keys(astNode.children?.userAuguments?.children || {});
      const payloadAuguments = Object.keys(astPayloadAuguments);
      const middlewares = Object.keys(astMiddlewares);
      if (middlewares.length) {
        middlewareRequireStatement = `const { ${middlewares.join(
          ','
        )} } = require('@app-core/middlewares');`;
      }
      // const userId = rc.meta.user.id;
      let payloadString = '{}';
      let destructureString = '';
      if (payloadAuguments.length) {
        payloadString = `{...${payloadAuguments.join(',...')}}`;
        destructureString = `const {${payloadAuguments.join(',')}} = rc;`;
      }
      const payloadUserAugment = [];
      rcUserAuguments.forEach((rc) => {
        const rcNode = astNode.children?.userAuguments?.children[rc];
        payloadUserAugment.push(`payload.${rcNode.dataType} = rc.meta.user.${rc};`);
      });
      const payloadUserAugmentString = payloadUserAugment.length
        ? payloadUserAugment.join('\n')
        : '';
      let serviceFuncDeclration = `const serviceFunc = () => true;`;
      if (service?.dataType) {
        serviceFuncDeclration = `const serviceFunc = require('../../services/${baseResourceFolder}/${service.dataType}-service');`;
      }
      const endpointString = serviceTemplateGen({
        jsdocString,
        httpMethod: astNode.http_method,
        httpPath: astNode.http_path,
        serviceName: astKey,
        jsdocTypeReference: astKey,
        middlewares: middlewares.join(','),
        middlewareRequireStatement,
        payloadString,
        destructureString,
        payloadUserAugmentString,
        serviceFuncDeclration,
      });
      endpointStringTokens.push(endpointString.replace(/\n{2,}/g, '\n\n'));
      writeFileWithDirs(
        `./endpoints/${baseResourceFolder}/${toKebabCase(astKey)}.js`,
        endpointString.replace(/\n{2,}/g, '\n\n')
      );
    }
  });
  return true;
}
module.exports = generateServiceFile;
