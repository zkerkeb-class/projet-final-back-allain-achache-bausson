const mongoose = require('mongoose');

const GarmentSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    category: { type: String, trim: true },
    color: { type: String, trim: true },
    imageUrl: { type: String, required: true },
    originalUrl: { type: String, default: '' },
    cutoutUrl: { type: String, default: '' },
    cloudinaryId: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Garment', GarmentSchema);
