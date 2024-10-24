const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const UserInviteCount = require("../../models/memberSchema");
const CoinflipRequest = require("../../models/CoinflipSchema");
module.exports = async (client, message) => {
  // if (message.content.startsWith("!coinflip") && !message.author.bot) {
  //   const args = message.content.split(" ");
  //   const challenged = message.mentions.users.first();
  //   const ticketAmount = parseInt(args[2], 10);
  //   const challenger = message.author;
  //   if (!challenged) {
  //     return message.reply("Please mention a user to challenge.");
  //   }
  //   if (challenger.id === challenged.id) {
  //     return message.reply("You cannot challenge yourself!");
  //   }
  //   if (isNaN(ticketAmount) || ticketAmount < 1) {
  //     return message.reply(
  //       "Please provide a valid number of tickets to bet (minimum 1)."
  //     );
  //   }
  //   const activeRequest = await CoinflipRequest.findOne({
  //     guildId: message.guild.id,
  //     $or: [
  //       { challengerId: challenger.id, status: "pending" },
  //       { challengedId: challenger.id, status: "pending" },
  //       { challengerId: challenged.id, status: "pending" },
  //       { challengedId: challenged.id, status: "pending" },
  //     ],
  //   });
  //   if (activeRequest) {
  //     return message.reply(
  //       "One of the users is already in an active coinflip challenge!"
  //     );
  //   }
  //   const challengerData = await UserInviteCount.findOne({
  //     guildId: message.guild.id,
  //     userId: challenger.id,
  //   });
  //   const challengedData = await UserInviteCount.findOne({
  //     guildId: message.guild.id,
  //     userId: challenged.id,
  //   });
  //   if (!challengerData || challengerData.tickets < ticketAmount) {
  //     return message.reply("You don't have enough tickets for this bet!");
  //   }
  //   if (!challengedData || challengedData.tickets < ticketAmount) {
  //     return message.reply(
  //       `${challenged.username} doesn't have enough tickets for this bet!`
  //     );
  //   }
  //   // Create new coinflip request in the database
  //   const newRequest = await CoinflipRequest.create({
  //     guildId: message.guild.id,
  //     challengerId: challenger.id,
  //     challengedId: challenged.id,
  //     tickets: ticketAmount,
  //   });
  //   // Create accept/decline buttons
  //   const acceptButton = new ButtonBuilder()
  //     .setCustomId(`coinflip_accept_${newRequest._id}`)
  //     .setLabel("Accept")
  //     .setStyle(ButtonStyle.Success);
  //   const declineButton = new ButtonBuilder()
  //     .setCustomId(`coinflip_decline_${newRequest._id}`)
  //     .setLabel("Decline")
  //     .setStyle(ButtonStyle.Danger);
  //   const row = new ActionRowBuilder().addComponents(
  //     acceptButton,
  //     declineButton
  //   );
  //   // Create challenge embed
  //   const challengeEmbed = new EmbedBuilder()
  //     .setTitle("🎲 Coinflip Challenge!")
  //     .setDescription(
  //       `${challenger} has challenged ${challenged} to a coinflip!\n\nTickets at stake: ${ticketAmount}`
  //     )
  //     .setColor("#FFD700")
  //     .setTimestamp();
  //   await message.channel.send({
  //     embeds: [challengeEmbed],
  //     components: [row],
  //   });
  // }
};
