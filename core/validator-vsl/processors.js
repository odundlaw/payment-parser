const schemaLineProcessor = require('./line-processors/schema-processor');
const isClosedLineProcessor = require('./line-processors/closed-line-processor');
const typeLineProcessor = require('./line-processors/type-processor');
const endpointRouteLineProcessor = require('./line-processors/endpoint-processor');
const multiLineCommentProcessor = require('./line-processors/multi-line-processor');
const commentBlockLineProcessor = require('./line-processors/comment-block-line-processor');

const processors = [
  schemaLineProcessor,
  isClosedLineProcessor,
  typeLineProcessor,
  endpointRouteLineProcessor,
];

const processorsLength = processors.length;
module.exports = function doRegexLineProcessing(line, lineNodeParent) {
  let nodeInfo;
  const commentProcessorResult = multiLineCommentProcessor(line);
  const parentIsCommentBlockOpening = lineNodeParent?.attributes?.isMultiLineCommentOpening;
  const isCommentClosing = commentProcessorResult.isMultiLineCommentClosing;
  const { isMultiLineCommentOpening } = commentProcessorResult;
  if (commentProcessorResult.isCommentNode || parentIsCommentBlockOpening) {
    if (
      (isCommentClosing && parentIsCommentBlockOpening) ||
      (!parentIsCommentBlockOpening && isMultiLineCommentOpening)
    ) {
      nodeInfo = commentProcessorResult;
    } else if (parentIsCommentBlockOpening) {
      nodeInfo = commentBlockLineProcessor(line);
    }
  } else {
    for (let x = 0; x < processorsLength; x++) {
      const processor = processors[x];
      const processorResult = processor(line);
      console.log(processorResult);
      if (processorResult.lineMatched) {
        nodeInfo = processorResult;
        break;
      }
    }
  }
  return nodeInfo;
};
