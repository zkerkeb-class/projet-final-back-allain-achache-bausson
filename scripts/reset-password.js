import bcrypt from "bcryptjs";
import connectDB from "../src/connect.js";
import User from "../src/models/User.js";
import { normalizeEmail } from "../src/utils/authValidation.js";

const [, , rawEmail, rawPassword] = process.argv;

const email = normalizeEmail(rawEmail);
const password = String(rawPassword || "");

if (!email || !password) {
  console.error("Usage: npm run reset:password -- <email> <nouveau_mot_de_passe>");
  process.exit(1);
}

if (password.length < 8) {
  console.error("Le mot de passe doit contenir au moins 8 caracteres.");
  process.exit(1);
}

await connectDB();

const user = await User.findOne({ email });

if (!user) {
  console.error(`Utilisateur introuvable: ${email}`);
  process.exit(1);
}

user.password = await bcrypt.hash(password, 10);
await user.save();

console.log(`Mot de passe mis a jour pour ${email}`);
process.exit(0);
