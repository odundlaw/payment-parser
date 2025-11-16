// const { processQualifiers, processPossibleValues } = require('./utils');
function processQualifiers(qualifiers) {
  let processedQualifiers;
  if (qualifiers) {
    processedQualifiers = {};
    const qualifierTokens = qualifiers.split('|');
    qualifierTokens.forEach((qt) => {
      const [qt_key, qt_value] = qt.split(':');
      processedQualifiers[qt_key] = {
        value: qt_value,
      };
    });
  }
  return processedQualifiers;
}

function processPossibleValues(values = '') {
  let processedValues;
  if (values) {
    processedValues = values.split('|');
  }
  return processedValues;
}

module.exports = {
  processQualifiers,
  processPossibleValues,
};
