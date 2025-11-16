const validator = require('@app-core/validator');
const { ERROR_CODE } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const { PaymentMessages } = require('@app/messages');

const SUPPORTED_TYPE = {
  credit: 'CREDIT',
  debit: 'DEBIT',
};

const SUPPORTED_CURRENCIES = {
  usd: 'USD',
  ngn: 'NGN',
  gbp: 'GBP',
  ghs: 'GHS',
};

const PARSER_CONFIG = {
  credit: {
    fields: {
      type: 0,
      amount: 1,
      currency: 2,
      credit_account: 5,
      debit_account: 10,
      execute_by: 12,
    },
  },
  debit: {
    fields: {
      type: 0,
      amount: 1,
      currency: 2,
      debit_account: 5,
      credit_account: 10,
      execute_by: 12,
    },
  },
};

function isValidAccountId(id) {
  if (!id || typeof id !== 'string') return false;

  const allowed = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-.@';

  for (let i = 0; i < id.length; i++) {
    if (!allowed.includes(id[i])) {
      return false;
    }
  }

  return true;
}

function isValidDateYYYYMMDD(dateStr) {
  if (!dateStr) return false;

  if (dateStr.length !== 10) return false;

  if (dateStr[4] !== '-' || dateStr[7] !== '-') return false;

  const yearStr = dateStr.slice(0, 4);
  const monthStr = dateStr.slice(5, 7);
  const dayStr = dateStr.slice(8, 10);

  const combined = yearStr + monthStr + dayStr;
  for (let i = 0; i < combined.length; i++) {
    const c = combined[i];
    if (c < '0' || c > '9') return false;
  }

  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (year < 1000 || year > 9999) return false;

  if (month < 1 || month > 12) return false;

  const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

  if (isLeap && month === 2) {
    if (day < 1 || day > 29) return false;
  } else if (day < 1 || day > daysInMonth[month]) return false;

  return true;
}

function parseInstructionData(instruction) {
  const words = instruction
    .split(' ')
    .map((w) => w.trim())
    .filter(Boolean);

  const first = words[0]?.toLowerCase();

  const info = {
    type: null,
    amount: null,
    currency: null,
    debit_account: null,
    credit_account: null,
    execute_by: null,
  };

  if (first && first in SUPPORTED_TYPE) {
    const config = PARSER_CONFIG[first];

    Object.entries(config.fields).forEach(([key, index]) => {
      let value = words[index] ?? null;

      if (key === 'currency' && value) value = value.toUpperCase();
      info[key] = value;
    });
  }

  return info;
}

function validateParsedFields(parsed, accountsMap) {
  if (parsed.type === null) {
    return { code: 'PR01', message: PaymentMessages.MALFORMED_INSTRUCTION };
  }

  if (!parsed.amount || Number.isNaN(parsed.amount)) {
    return { code: 'AM01', message: PaymentMessages.INVALID_AMOUNT };
  }

  if (parsed.amount.includes('.')) {
    return { code: 'AM01', message: PaymentMessages.INVALID_AMOUNT };
  }

  const amount = Number(parsed.amount);
  if (amount <= 0) {
    return { code: 'AM01', message: PaymentMessages.INVALID_AMOUNT };
  }

  if (!parsed.currency || !(parsed.currency.toLowerCase() in SUPPORTED_CURRENCIES)) {
    return { code: 'CU02', message: PaymentMessages.UNSUPPORTED_CURRENCY };
  }

  if (!isValidAccountId(parsed.debit_account) && !isValidAccountId(parsed.credit_account)) {
    return { code: 'AC04', message: PaymentMessages.INVALID_ACCOUNT_ID };
  }

  const debit = accountsMap.get(parsed.debit_account);
  const credit = accountsMap.get(parsed.credit_account);

  if (!debit || !credit) {
    return { code: 'AC03', message: PaymentMessages.ACCOUNT_NOT_FOUND };
  }

  if (parsed.debit_account === parsed.credit_account) {
    return { code: 'AC02', message: PaymentMessages.SAME_ACCOUNT_ERROR };
  }

  if (debit.currency.toUpperCase() !== credit.currency.toUpperCase()) {
    return { code: 'CU01', message: PaymentMessages.CURRENCY_MISMATCH };
  }

  const { type } = parsed;
  const typeNormalized = type?.toLowerCase();
  const isCredit = typeNormalized === 'credit';
  const isDebit = typeNormalized === 'debit';

  if (!isCredit && !isDebit) {
    return { code: 'SY03', message: PaymentMessages.MISSING_KEYWORD };
  }

  if (parsed.type === SUPPORTED_TYPE.debit && debit.balance < amount) {
    return { code: 'AC01', message: PaymentMessages.INSUFFICIENT_FUNDS };
  }

  if (parsed.execute_by && !isValidDateYYYYMMDD(parsed.execute_by)) {
    return { code: 'DT01', message: PaymentMessages.INVALID_DATE_FORMAT };
  }

  return null; // should be null since no errors
}

async function parseInstruction(serviceData, options = {}) {
  const spec = `root {
    accounts[] {
      id string
      balance number
      currency string
    }
    instruction string
  }`;

  const parsedSpec = validator.parse(spec);

  let response = {
    type: null,
    amount: null,
    currency: null,
    debit_account: null,
    credit_account: null,
    execute_by: null,
    status: 'failed',
    status_reason: PaymentMessages.FAILED_GENERIC,
    status_code: 'PR01',
    accounts: [],
  };

  try {
    const data = validator.validate(serviceData, parsedSpec);

    const instruction = data.instruction.trim();
    const { accounts } = data;

    const accountsMap = new Map();
    accounts.forEach((a) => accountsMap.set(a.id, a));

    const parsed = parseInstructionData(instruction);

    if (!parsed.type) {
      response.status = 'failed';
      response.status_reason = PaymentMessages.MALFORMED_INSTRUCTION;
      response.status_code = 'SY03';
    } else {
      const validationError = validateParsedFields(parsed, accountsMap);

      if (validationError) {
        response.status = 'failed';
        response.status_reason = validationError.message;
        response.status_code = validationError.code;
      } else {
        const debit = accountsMap.get(parsed.debit_account);
        const credit = accountsMap.get(parsed.credit_account);

        const debitBefore = debit.balance;
        const creditBefore = credit.balance;

        let executeStatus = 'successful';
        let code = 'AP00';

        if (parsed.execute_by) {
          const yyyyMMdd = parsed.execute_by;
          const execUTC = Date.UTC(
            Number(yyyyMMdd.slice(0, 4)),
            Number(yyyyMMdd.slice(5, 7)) - 1,
            Number(yyyyMMdd.slice(8, 10))
          );

          const now = new Date();
          const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

          if (execUTC > todayUTC) {
            executeStatus = 'pending';
            code = 'AP02';
          }
        }

        if (executeStatus === 'successful') {
          if (parsed.type === SUPPORTED_TYPE.debit) {
            debit.balance -= parsed.amount;
            credit.balance += parsed.amount;
          } else {
            credit.balance += parsed.amount;
            debit.balance -= parsed.amount;
          }
        }

        const finalAccounts = accounts
          .filter((acc) => acc.id === parsed.debit_account || acc.id === parsed.credit_account)
          .map((acc) => ({
            id: acc.id,
            balance: acc.balance,
            balance_before: acc.id === parsed.debit_account ? debitBefore : creditBefore,
            currency: acc.currency.toUpperCase(),
          }));

        response = {
          ...response,
          type: parsed.type,
          amount: parsed.amount ? Number(parsed.amount) : null,
          currency: parsed.currency,
          debit_account: parsed.debit_account,
          credit_account: parsed.credit_account,
          execute_by: parsed.execute_by,
          status: executeStatus,
          status_code: code,
          status_reason:
            executeStatus === 'pending'
              ? PaymentMessages.TRANSACTION_PENDING
              : PaymentMessages.TRANSACTION_SUCCESSFUL,
          accounts: finalAccounts,
        };
      }
    }
  } catch (error) {
    appLogger.errorX(error, 'parse-instruction-error');
    throw error;
  }

  return response;
}

module.exports = parseInstruction;
