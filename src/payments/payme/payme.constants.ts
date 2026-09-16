export enum PaymeMethod {
  CHECK_PERFORM_TRANSACTION = 'CheckPerformTransaction',
  CREATE_TRANSACTION = 'CreateTransaction',
  PERFORM_TRANSACTION = 'PerformTransaction',
  CANCEL_TRANSACTION = 'CancelTransaction',
  CHECK_TRANSACTION = 'CheckTransaction',
  GET_STATEMENT = 'GetStatement',
}

// Payme rasmiy JSON-RPC xatolik kodlari
export const PaymeError = {
  INVALID_AMOUNT: -31001,
  TRANSACTION_NOT_FOUND: -31003,
  COULD_NOT_CANCEL: -31007,
  COULD_NOT_PERFORM: -31008,
  ACCOUNT_NOT_FOUND: -31050, // -31050..-31099 oralig'i merchant business-logika uchun ajratilgan
  AUTH_FAILED: -32504,
  METHOD_NOT_FOUND: -32601,
};

// Payme tranzaksiya holatlari
export enum PaymeTransactionState {
  CREATED = 1, // Yaratildi, kutilmoqda
  PERFORMED = 2, // Muvaffaqiyatli yakunlandi
  CANCELLED_AFTER_CREATE = -1,
  CANCELLED_AFTER_PERFORM = -2,
}
