export const isValidPhoneNumber = (value) => {
  const phone = String(value ?? "").trim();
  const digits = phone.replace(/\D/g, "");
  return (
    /^\+?[()\d\s.-]+$/.test(phone) &&
    digits.length >= 7 &&
    digits.length <= 15
  );
};