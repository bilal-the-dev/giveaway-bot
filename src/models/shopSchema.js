const mongoose = require("mongoose");

const shopItemSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  label: { type: String, required: true },
  cost: { type: Number, required: true },
  stock: { type: Number, default: -1 }, // -1 means unlimited stock
  imageUrl: { type: String, required: true },
  description: { type: String, default: "No description provided" },
  createdBy: { type: String, required: true }, // Discord user ID of creator
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update the updatedAt timestamp before saving
shopItemSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("ShopItem", shopItemSchema);
