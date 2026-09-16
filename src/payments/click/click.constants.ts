// Click Merchant API rasmiy xatolik kodlari
export enum ClickError {
  SUCCESS = 0,
  SIGN_CHECK_FAILED = -1,
  INVALID_AMOUNT = -2,
  ACTION_NOT_FOUND = -3,
  ALREADY_PAID = -4,
  USER_NOT_FOUND = -5,
  TRANSACTION_NOT_FOUND = -6,
  FAILED_TO_UPDATE_USER = -7,
  BAD_REQUEST = -8,
  TRANSACTION_CANCELLED = -9,
}

export enum ClickAction {
  PREPARE = 0,
  COMPLETE = 1,
}
