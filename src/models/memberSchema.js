const mongoose = require("mongoose");

const userInviteCountSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  tickets: { type: Number, default: 0 },
  weeklyInvites: { type: Number, default: 0 },
  weeklyMessages: { type: Number, default: 0 },
  lastResetTimestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("UserInviteCount", userInviteCountSchema);
