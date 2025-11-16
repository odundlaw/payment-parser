const fs = require('fs');
const path = require('path');
const lexer = require('./util-lex-file');
const astGenerator = require('./ast-generator');
const typescriptGenerator = require('./util-typescript-generator');
const serviceFileGenerator = require('./util-service-file-generator');
const endpointFileGenerator = require('./util-endpoint-file-generator');
const mongooseSchemaGenerator = require('./util-mongoose-schema-generator');
const endpointDocGenerator = require('./util-endpoint-doc-generator');
const loadSPCLConfig = require('./util-load-config');
// console.log(process.cwd(), process.argv);

const usableArgs = process.argv.slice(2);
const [fileName] = usableArgs;
// console.log(
//   process.cwd(),
//   __dirname,
//   path.join(__dirname, fileName || 'index.spc'),
//   usableArgs,
// );
const lookupFile = path.join(process.cwd(), fileName || 'index.spc');
const configFile = path.join(process.cwd(), 'spcl.json');
const fileExists = fs.existsSync(lookupFile);
const configFileExists = fs.existsSync(configFile);
if (fileExists) {
  // console.log(lexer(lookupFile));
  let config = {};
  if (configFileExists) {
    config = loadSPCLConfig(configFile);
  }
  const lexicalTokens = lexer(lookupFile);
  const { nodes, rootNodes } = lexicalTokens;
  const abstractSyntaxTree = astGenerator({}, rootNodes, nodes);
  serviceFileGenerator(abstractSyntaxTree);
  endpointFileGenerator(abstractSyntaxTree);
  mongooseSchemaGenerator(abstractSyntaxTree, config?.models);
  endpointDocGenerator(abstractSyntaxTree);
  fs.writeFileSync(
    './spcl.txt',
    JSON.stringify(
      {
        abstractSyntaxTree,
        ts: typescriptGenerator(abstractSyntaxTree, 0, abstractSyntaxTree),
        // serv: serviceFileGenerator(abstractSyntaxTree),
      },
      null,
      2
    ),
    { encoding: 'utf-8' }
  );
} else {
  console.warn(`${lookupFile} not found`);
}
