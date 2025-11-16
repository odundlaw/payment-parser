const PaymentMessages = {
  INVALID_AMOUNT: 'Amount must be a positive integer',
  CURRENCY_MISMATCH: 'Account currency mismatch',
  UNSUPPORTED_CURRENCY: 'Only NGN, USD, GBP, and GHS are supported',
  INSUFFICIENT_FUNDS: 'Insufficient funds in debit account',
  SAME_ACCOUNT_ERROR: 'Debit and credit accounts cannot be the same',
  ACCOUNT_NOT_FOUND: 'Account not found',
  INVALID_ACCOUNT_ID: 'Invalid account ID format',
  INVALID_DATE_FORMAT: 'Date must be in YYYY-MM-DD format',
  MISSING_KEYWORD: 'Missing required keyword',
  INVALID_KEYWORD_ORDER: 'Invalid keyword order',
  MALFORMED_INSTRUCTION: 'Malformed instruction: unable to parse keywords',
  TRANSACTION_SUCCESSFUL: 'Transaction executed successfully',
  TRANSACTION_PENDING: 'Transaction scheduled for future execution',
};

module.exports = PaymentMessages;
