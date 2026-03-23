const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

export const validateCredentials = ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email);
  const safePassword = String(password || "");
  const errors = [];

  if (!normalizedEmail) {
    errors.push("Email requis.");
  } else if (!emailPattern.test(normalizedEmail)) {
    errors.push("Email invalide.");
  }

  if (!safePassword) {
    errors.push("Mot de passe requis.");
  } else if (safePassword.length < 8) {
    errors.push("Le mot de passe doit contenir au moins 8 caractères.");
  }

  return {
    email: normalizedEmail,
    password: safePassword,
    errors,
  };
};
