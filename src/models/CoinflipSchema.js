const mongoose = require("mongoose");

const coinflipRequestSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  challengerId: { type: String, required: true },
  challengedId: { type: String, required: true },
  tickets: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["pending", "accepted", "declined", "completed", "expired"],
    default: "pending",
  },
  result: { type: String, enum: ["heads", "tails", null], default: null },
  winnerId: { type: String, default: null },
});

coinflipRequestSchema.index({ timestamp: 1 }, { expireAfterSeconds: 300 });
module.exports = mongoose.model("CoinflipRequest", coinflipRequestSchema);
