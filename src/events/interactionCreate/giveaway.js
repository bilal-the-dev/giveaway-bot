const {
  EmbedBuilder,
  ActionRowBuilder,
  TextInputStyle,
  TextInputBuilder,
  ModalBuilder,
} = require("discord.js");
const giveawaySchema = require("../../models/giveawaySchema");
const UserInviteCount = require("../../models/memberSchema");
module.exports = async (client, interaction) => {
  try {
    if (!interaction.isButton()) return;
    if (interaction.customId.startsWith(`giveaway_enter`)) {
      const giveawayId = interaction.customId.split("_")[2];
      const giveaway = await giveawaySchema.findById(giveawayId);

      if (!giveaway) {
        return interaction.reply({
          content: "This giveaway does not exist.",
          ephemeral: true,
        });
      }

      if (giveaway.endTime < Date.now()) {
        return interaction.reply({
          content: "This giveaway has already ended.",
          ephemeral: true,
        });
      }

      if (!giveaway.isActive) {
        return interaction.reply({
          content: "This giveaway is no longer active.",
          ephemeral: true,
        });
      }
      const existingParticipant = giveaway.participants.find(
        (p) => p.userId === interaction.user.id
      );

      if (existingParticipant) {
        const modal = new ModalBuilder()
          .setCustomId(`giveaway_modal_${giveaway._id}`)
          .setTitle("Enter Giveaway");

        const ticketInput = new TextInputBuilder()
          .setCustomId("ticketCount")
          .setLabel("How many tickets do you want to enter?")
          .setStyle(TextInputStyle.Short)
          .setMinLength(1)
          .setMaxLength(3)
          .setPlaceholder("Enter a number between 1 and 100")
          .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(
          ticketInput
        );
        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
      } else {
        let userInviteCount = await UserInviteCount.findOne({
          guildId: interaction.guildId,
          userId: interaction.user.id,
        });

        if (!userInviteCount) {
          userInviteCount = new UserInviteCount({
            guildId: interaction.guildId,
            userId: interaction.user.id,
            tickets: 0,
          });
          await userInviteCount.save();
        }
        let ticketsToUse = 1;
        await userInviteCount.save();
        giveaway.participants.push({
          userId: interaction.user.id,
          tickets: 1,
        });

        giveaway.totalTickets += ticketsToUse;

        const imageEmbeds = interaction.message.embeds[0].data.image.url;
        await giveaway.save();
        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds)
          .setDescription(
            `${
              giveaway.label
            }\n\nClick the button below to enter!\nEnds: <t:${Math.floor(
              giveaway.endTime.getTime() / 1000
            )}:R>\n\nTotal Tickets: ${giveaway.totalTickets}`
          )
          .setImage(imageEmbeds);

        await interaction.message.edit({
          embeds: [updatedEmbed],
        });

        await interaction.reply({
          content: `You have successfully entered the giveaway with 1 ticket!`,
          ephemeral: true,
        });
      }
    } else if (interaction.customId.startsWith(`giveaway_top_entries`)) {
      await interaction.deferReply({ ephemeral: true });
      const giveawayId = interaction.customId.split("_")[3];
      const updatedGiveaway = await giveawaySchema.findById(giveawayId);
      if (!updatedGiveaway) {
        return interaction.editReply({
          content: "This giveaway no longer exists.",
          ephemeral: true,
        });
      }
      await showTopEntries(interaction, updatedGiveaway);
    }
  } catch (e) {
    console.log(e);
  }
};

async function showTopEntries(interaction, giveaway) {
  const sortedParticipants = giveaway.participants.sort(
    (a, b) => b.tickets - a.tickets
  );
  const top10Participants = sortedParticipants.slice(0, 10);

  let description = "```md\n# Top Entries\n\n";
  description += "Rank | User          | Tickets\n";
  description += "===================================\n";

  for (let i = 0; i < top10Participants.length; i++) {
    const participant = top10Participants[i];
    const rank = i + 1;
    const rankEmoji =
      rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`;

    // Fetch user information
    const user = await interaction.client.users.fetch(participant.userId);
    const displayName = user ? user.username.slice(0, 13) : "Unknown User";

    description += `${rankEmoji.padEnd(5)}| ${displayName.padEnd(14)}| ${
      participant.tickets
    }\n`;
  }

  description += "```";

  const topEntriesEmbed = new EmbedBuilder()
    .setTitle("🏆 Top Giveaway Entries 🏆")
    .setDescription(description)
    .setColor("#FFD700")
    .setFooter({ text: `Total Entries: ${giveaway.totalTickets}` })
    .setTimestamp();

  await interaction.editReply({ embeds: [topEntriesEmbed], ephemeral: true });
}
