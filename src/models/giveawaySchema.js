const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  tickets: { type: Number, required: true, default: 1 },
});
const giveawaySchema = new mongoose.Schema({
  guildId: String,
  channelId: String,
  messageId: String,
  label: String,
  endTime: Date,
  totalTickets: { type: Number, default: 0 },
  participants: [participantSchema],
  isActive: { type: Boolean, default: true },
});

module.exports = mongoose.model("Giveaway", giveawaySchema);
