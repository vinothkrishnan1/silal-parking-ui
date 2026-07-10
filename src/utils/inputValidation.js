export const sanitizeDigits = (value, maxLength = Infinity) =>
  String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, maxLength);

export const sanitizeDecimal = (value, maxDecimals = 3) => {
  const input = String(value ?? '').replace(/[^\d.]/g, '');
  if (!input) return '';

  const [integerPart = '', ...decimalParts] = input.split('.');
  const normalizedInteger = integerPart.replace(/\D/g, '');

  if (decimalParts.length === 0) {
    return normalizedInteger;
  }

  const normalizedDecimal = decimalParts.join('').replace(/\D/g, '').slice(0, maxDecimals);
  const safeInteger = normalizedInteger || '0';

  return `${safeInteger}.${normalizedDecimal}`;
};

export const isEightDigitPhoneNumber = (value) => /^\d{8}$/.test(sanitizeDigits(value, 8));
