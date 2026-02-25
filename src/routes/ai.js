const express = require('express');
const Garment = require('../models/Garment');

const router = express.Router();

const normalize = (value) => (value || '').toString().trim().toLowerCase();

const categoryGroups = {
  top: ['haut', 'top', 'tshirt', 't-shirt', 'pull', 'chemise', 'blouse', 'sweat', 'hoodie', 'cardigan'],
  bottom: ['bas', 'pantalon', 'jean', 'jupe', 'short', 'legging'],
  shoes: ['chaussure', 'basket', 'sneaker', 'boot', 'bott', 'sandale'],
  dress: ['robe', 'dress'],
  outer: ['veste', 'manteau', 'coat', 'blazer'],
  accessory: ['sac', 'bag', 'ceinture', 'hat', 'cap', 'bonnet', 'bijou', 'jewel', 'echarpe', 'écharpe', 'earring', 'earrings'],
};

const neutralColors = new Set(['black', 'noir', 'white', 'blanc', 'gray', 'grey', 'gris', 'beige', 'cream', 'creme', 'ivory', 'navy', 'marine', 'brown', 'marron', 'tan']);

const colorAliases = {
  noir: 'black',
  black: 'black',
  blanc: 'white',
  white: 'white',
  gris: 'gray',
  gray: 'gray',
  grey: 'gray',
  beige: 'beige',
  creme: 'cream',
  cream: 'cream',
  ivory: 'ivory',
  marine: 'navy',
  navy: 'navy',
  marron: 'brown',
  brown: 'brown',
  rouge: 'red',
  red: 'red',
  bleu: 'blue',
  blue: 'blue',
  vert: 'green',
  green: 'green',
  jaune: 'yellow',
  yellow: 'yellow',
  rose: 'pink',
  pink: 'pink',
  violet: 'purple',
  purple: 'purple',
  orange: 'orange',
  denim: 'blue',
};

const colorCompatibility = {
  red: new Set(['black', 'white', 'beige', 'gray', 'blue']),
  blue: new Set(['white', 'beige', 'gray', 'black', 'brown']),
  green: new Set(['white', 'beige', 'gray', 'black']),
  yellow: new Set(['black', 'white', 'gray', 'blue']),
  pink: new Set(['white', 'gray', 'black', 'beige']),
  purple: new Set(['white', 'gray', 'black']),
  orange: new Set(['white', 'beige', 'black', 'brown']),
};

const guessGroup = (category) => {
  const value = normalize(category);
  if (!value) return 'unknown';
  for (const [group, keywords] of Object.entries(categoryGroups)) {
    if (keywords.some((word) => value.includes(word))) {
      return group;
    }
  }
  return 'unknown';
};

const normalizeColor = (color) => {
  const value = normalize(color);
  if (!value) return '';
  return colorAliases[value] || value;
};

const isCompatibleColor = (seedColor, itemColor) => {
  const a = normalizeColor(seedColor);
  const b = normalizeColor(itemColor);
  if (!a || !b) return true;
  if (neutralColors.has(a) || neutralColors.has(b)) return true;
  if (a === b) return true;
  if (colorCompatibility[a]?.has(b)) return true;
  if (colorCompatibility[b]?.has(a)) return true;
  return false;
};

const pickItems = (items, group, seedColor, limit = 3) => {
  let candidates = items.filter((item) => guessGroup(item.category) === group);
  if (candidates.length === 0) {
    candidates = items;
  }

  const compatible = seedColor ? candidates.filter((item) => isCompatibleColor(seedColor, item.color)) : candidates;
  const finalList = compatible.length > 0 ? compatible : candidates;
  return finalList.slice(0, limit);
};

const targetGroupsForSeed = (seedGroup) => {
  switch (seedGroup) {
    case 'top':
      return ['bottom', 'shoes', 'outer'];
    case 'bottom':
      return ['top', 'shoes', 'outer'];
    case 'dress':
      return ['shoes', 'outer', 'accessory'];
    case 'shoes':
      return ['top', 'bottom', 'outer'];
    default:
      return ['top', 'bottom', 'shoes'];
  }
};

router.get('/health', (req, res) => {
  res.json({ status: 'ok', mode: 'local-rules' });
});

router.post('/recommend', async (req, res) => {
  try {
    const { seedId } = req.body || {};
    const items = await Garment.find().sort({ createdAt: -1 });

    if (items.length === 0) {
      return res.json({ message: 'Ajoute des vêtements pour obtenir des recommandations', recommendations: [] });
    }

    let seed = null;
    if (seedId) {
      seed = items.find((item) => item._id.toString() === seedId);
      if (!seed) {
        seed = await Garment.findById(seedId).catch(() => null);
      }
    }

    const seedGroup = seed ? guessGroup(seed.category) : 'unknown';
    const seedColor = seed ? seed.color : '';
    const groups = targetGroupsForSeed(seedGroup);

    const recommendations = groups.map((group) => ({
      group,
      items: pickItems(items, group, seedColor, 3),
    }));

    res.json({ seed, recommendations });
  } catch (err) {
    res.status(500).json({ error: 'Failed to build recommendations' });
  }
});

router.post('/assistant', async (req, res) => {
  try {
    const prompt = normalize(req.body?.prompt);
    const items = await Garment.find().sort({ createdAt: -1 });

    if (items.length === 0) {
      return res.json({
        message: 'Ajoute quelques vêtements pour que je puisse proposer une tenue.',
        outfit: {},
      });
    }

    const seedColor = prompt.includes('noir') || prompt.includes('black') ? 'black'
      : prompt.includes('blanc') || prompt.includes('white') ? 'white'
      : prompt.includes('beige') ? 'beige'
      : prompt.includes('bleu') || prompt.includes('blue') ? 'blue'
      : prompt.includes('vert') || prompt.includes('green') ? 'green'
      : prompt.includes('rouge') || prompt.includes('red') ? 'red'
      : prompt.includes('rose') || prompt.includes('pink') ? 'pink'
      : '';

    const outfit = {
      top: pickItems(items, 'top', seedColor, 1)[0] || null,
      bottom: pickItems(items, 'bottom', seedColor, 1)[0] || null,
      shoes: pickItems(items, 'shoes', seedColor, 1)[0] || null,
      outer: pickItems(items, 'outer', seedColor, 1)[0] || null,
      dress: pickItems(items, 'dress', seedColor, 1)[0] || null,
      accessory: pickItems(items, 'accessory', seedColor, 1)[0] || null,
    };

    const parts = [];
    if (outfit.top) parts.push(`un haut ${outfit.top.color || ''}`.trim());
    if (outfit.bottom) parts.push(`un bas ${outfit.bottom.color || ''}`.trim());
    if (outfit.shoes) parts.push(`des chaussures ${outfit.shoes.color || ''}`.trim());
    if (outfit.outer) parts.push(`une veste ${outfit.outer.color || ''}`.trim());
    if (outfit.dress) parts.push(`une robe ${outfit.dress.color || ''}`.trim());

    const message = parts.length > 0
      ? `Je te propose ${parts.join(', ')}.`
      : 'Je n\'ai pas assez de pièces pour composer une tenue.';

    res.json({ message, outfit });
  } catch (err) {
    res.status(500).json({ error: 'Assistant failed' });
  }
});

module.exports = router;
