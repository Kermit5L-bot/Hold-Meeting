export const PHONE_DIGIT_LENGTH = 11;

export function normalizePhoneDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

export function isValidPhoneLength(phone: string) {
  return normalizePhoneDigits(phone).length === PHONE_DIGIT_LENGTH;
}

export function phoneLengthMessage() {
  return `手机号需填写 ${PHONE_DIGIT_LENGTH} 位数字。`;
}
