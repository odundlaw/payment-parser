const fs = require('fs');

function loadConfig(filePath) {
  let config = {};
  try {
    const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });
    config = JSON.parse(fileContent);
    // console.log(config);
  } catch (e) {
    //
  }
  return config;
}

module.exports = loadConfig;
