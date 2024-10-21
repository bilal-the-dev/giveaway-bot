const mongoose = require("mongoose");

const userInviteCountSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  tickets: { type: Number, default: 0 },
});

module.exports = mongoose.model("UserInviteCount", userInviteCountSchema);
