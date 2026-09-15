export type RegisterInput = {
  fullName: string;
  identifier: string;
  password: string;
  confirmPassword: string;
};

export type ValidationErrors = Partial<Record<keyof RegisterInput, string>> & { form?: string };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const VIETNAM_PHONE_REGEX = /^(?:\+84|84|0)(?:3|5|7|8|9)\d{8}$/;

export function normalizePhone(value: string): string {
  const digits = value.replace(/[\s().-]/g, "");
  if (digits.startsWith("+84")) return `0${digits.slice(3)}`;
  if (digits.startsWith("84")) return `0${digits.slice(2)}`;
  return digits;
}
export function isEmail(value: string): boolean { return EMAIL_REGEX.test(value.trim().toLowerCase()); }
export function isVietnamPhone(value: string): boolean { return VIETNAM_PHONE_REGEX.test(normalizePhone(value)); }

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự.";
  if (!/[A-Z]/.test(password)) return "Mật khẩu phải có ít nhất 1 chữ hoa.";
  if (!/[a-z]/.test(password)) return "Mật khẩu phải có ít nhất 1 chữ thường.";
  if (!/\d/.test(password)) return "Mật khẩu phải có ít nhất 1 chữ số.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Mật khẩu phải có ít nhất 1 ký tự đặc biệt.";
  return null;
}

export function validateRegister(input: RegisterInput): ValidationErrors {
  const errors: ValidationErrors = {};
  const fullName = input.fullName.trim();
  const identifier = input.identifier.trim();
  if (fullName.length < 2) errors.fullName = "Vui lòng nhập họ và tên hợp lệ.";
  if (!identifier) errors.identifier = "Vui lòng nhập email hoặc số điện thoại.";
  else if (!isEmail(identifier) && !isVietnamPhone(identifier)) errors.identifier = "Email hoặc số điện thoại không đúng định dạng.";
  const passwordError = validatePassword(input.password);
  if (passwordError) errors.password = passwordError;
  if (input.confirmPassword !== input.password) errors.confirmPassword = "Mật khẩu nhập lại không khớp.";
  return errors;
}
