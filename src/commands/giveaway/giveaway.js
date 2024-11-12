const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const ms = require("ms");
const Giveaway = require("../../models/giveawaySchema");
const UserInviteCount = require("../../models/memberSchema");

module.exports = {
  name: "giveaway",
  description: "Start a new giveaway",
  options: [
    {
      name: "channel",
      description: "The channel to host the giveaway",
      required: true,
      type: ApplicationCommandOptionType.Channel,
    },
    {
      name: "duration",
      description: "The duration of the giveaway (e.g., 1d, 12h, 30m)",
      required: true,
      type: ApplicationCommandOptionType.String,
    },
    {
      name: "label",
      description: "The label for the giveaway",
      required: true,
      type: ApplicationCommandOptionType.String,
    },
    {
      name: "image",
      description: "The image for the giveaway",
      required: true,
      type: ApplicationCommandOptionType.Attachment,
    },
  ],

  callback: async (client, interaction) => {
    try {
      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return interaction.reply({
          content: "You do not have permission to make giveaway.",
          ephemeral: true,
        });
      }
      await interaction.deferReply();
      const channel = interaction.options.getChannel("channel");
      const durationString = interaction.options.getString("duration");
      const label = interaction.options.getString("label");
      const image = interaction.options.getAttachment("image");

      const duration = ms(durationString);
      if (!duration || isNaN(duration)) {
        return await interaction.editReply({
          content:
            'Invalid duration format. Please use formats like "1d", "12h", or "30m".',
          ephemeral: true,
        });
      }

      const endTime = new Date(Date.now() + duration);

      const giveaway = new Giveaway({
        guildId: interaction.guildId,
        channelId: channel.id,
        label: label,
        endTime: endTime,
      });

      await giveaway.save();

      await interaction.editReply(`Giveaway started in ${channel}!`);

      const embed = new EmbedBuilder()
        .setTitle("🎉 Giveaway! 🎉")
        .setDescription(
          `${label}\n\nClick the button below to enter!\nEnds: <t:${Math.floor(
            endTime.getTime() / 1000
          )}:R>`
        )
        .setColor("#FF00FF")
        .setImage(image.url);

      const button = new ButtonBuilder()
        .setCustomId(`giveaway_enter_${giveaway._id}`)
        .setLabel("Enter Giveaway")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🎟️");

      const topEntriesButton = new ButtonBuilder()
        .setCustomId(`giveaway_top_entries_${giveaway._id}`)
        .setLabel("Top Entries")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🏆");

      const totalTicketsButton = new ButtonBuilder()
        .setCustomId(`giveaway_total_tickets_${giveaway._id}`)
        .setLabel("Total Tickets")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("📍");

      const row = new ActionRowBuilder().addComponents(
        button,
        topEntriesButton,
        totalTicketsButton
      );

      const message = await channel.send({
        content: interaction.guild.roles.everyone.toString(),
        embeds: [embed],
        components: [row],
      });

      giveaway.messageId = message.id;
      await giveaway.save();
    } catch (e) {
      console.log(e);
    }
  },
};
