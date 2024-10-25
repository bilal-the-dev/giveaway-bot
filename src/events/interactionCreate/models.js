const { EmbedBuilder } = require("discord.js");
const giveawaySchema = require("../../models/giveawaySchema");
const UserInviteCount = require("../../models/memberSchema");
module.exports = async (client, interaction) => {
  try {
    if (!interaction.isModalSubmit()) return;
    if (!interaction.customId.startsWith(`giveaway_modal_`)) return;

    await interaction.deferReply({ ephemeral: true });
    const giveawayId = interaction.customId.split("_")[2];
    const ticketCount = parseInt(
      interaction.fields.getTextInputValue("ticketCount")
    );

    if (isNaN(ticketCount) || ticketCount < 1 || ticketCount > 100) {
      return await interaction.editReply(
        "Please enter a valid number between 1 and 100."
      );
    }

    const giveaway = await giveawaySchema.findById(giveawayId);

    if (!giveaway)
      return await interaction.editReply("This giveaway no longer exists.");

    let userInviteCount = await UserInviteCount.findOne({
      guildId: interaction.guildId,
      userId: interaction.user.id,
    });

    if (ticketCount > userInviteCount.tickets) {
      return await interaction.editReply(
        `You do not have enough tickets to enter with ${ticketCount}. You have ${userInviteCount.tickets} ticket(s) available.`
      );
    }
    userInviteCount.tickets -= ticketCount;
    giveaway.totalTickets += ticketCount;

    let participant = giveaway.participants.find(
      (p) => p.userId === interaction.user.id
    );

    if (participant) {
      participant.tickets += ticketCount;
    } else {
      giveaway.participants.push({
        userId: interaction.user.id,
        tickets: ticketCount,
      });
    }
    await giveaway.save();
    await userInviteCount.save();
    const channel = await client.channels.fetch(giveaway.channelId);
    const message = await channel.messages.fetch(giveaway.messageId);

    // const updatedEmbed = EmbedBuilder.from(message.embeds[0]).setDescription(
    //   message.embeds[0].description.replace(
    //     /Total Tickets: \d+/,
    //     `Total Tickets: ${giveaway.totalTickets}`
    //   )
    // );

    // await message.edit({ embeds: [updatedEmbed] });

    await interaction.editReply({
      content: `You have entered the giveaway with ${ticketCount} additional ticket(s). Your total entries for this giveaway: ${
        participant ? participant.tickets : ticketCount
      }`,
      ephemeral: true,
    });
  } catch (e) {
    console.log(e);
  }
};
