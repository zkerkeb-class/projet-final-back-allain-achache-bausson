// src/routes/users.js
import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// ✅ Créer un utilisateur (inscription)
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Utilisateur déjà existant' });

    const newUser = new User({ email, password, name });
    await newUser.save();
    res.status(201).json({ message: 'Utilisateur créé avec succès', userId: newUser._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Connexion utilisateur
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Mot de passe incorrect' });

    res.json({ message: 'Connexion réussie', userId: user._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;