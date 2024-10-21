const UserInviteCount = require("../../models/memberSchema");
module.exports = async (client, message) => {
  if (message.author.bot || !message.content.startsWith("!ticket")) return;

  // Split the message content into arguments
  const args = message.content.slice("!ticket".length).trim().split(/ +/);

  // Ensure there is a user mentioned
  const user = message.mentions.users.first(); // Get the mentioned user
  if (!user) return message.reply("Please mention a valid user.");

  const guildId = message.guild.id;

  // Fetch the user's tickets data from the database
  let userTickets = await UserInviteCount.findOne({
    guildId,
    userId: user.id,
  });

  // If no record exists for the user, create a new one with 0 tickets
  if (!userTickets) {
    userTickets = new UserInviteCount({
      guildId,
      userId: user.id,
      tickets: 0,
    });
    await userTickets.save(); // Save the new record to the database
  }

  // Respond with the number of tickets the user has
  message.reply(`${user.username} has ${userTickets.tickets} ticket(s).`);
};
