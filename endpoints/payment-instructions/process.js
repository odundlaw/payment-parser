const { createHandler } = require('@app-core/server');
const parseInstruction = require('@app/services/payment-processor/parse-instruction');

module.exports = createHandler({
  path: '/payment-instructions',
  method: 'post',
  middlewares: [],
  props: {},

  async handler(rc, helpers) {
    const payload = {
      ...rc.body,
    };

    const response = await parseInstruction(payload);
    let status;
    let message;

    if (response.status === 'successful' || response.status === 'pending') {
      status = helpers.http_statuses.HTTP_200_OK;
      message = 'Transaction executed successfully';
    } else {
      status = helpers.http_statuses.HTTP_400_BAD_REQUEST;
      message = response.status_reason || 'Failed to process instruction';
    }

    return {
      status,
      message,
      data: response,
    };
  },
});
