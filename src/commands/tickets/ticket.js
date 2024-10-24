const {
  ApplicationCommandOptionType,
  PermissionsBitField,
} = require("discord.js");
const UserInviteCount = require("../../models/memberSchema");

module.exports = {
  name: "tickets",
  description: "Manage user tickets",
  options: [
    {
      name: "add",
      description: "Add tickets to a user",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "user",
          description: "The user to add tickets to",
          type: ApplicationCommandOptionType.User,
          required: true,
        },
        {
          name: "amount",
          description: "The number of tickets to add",
          type: ApplicationCommandOptionType.Integer,
          required: true,
        },
      ],
    },
    {
      name: "remove",
      description: "Remove tickets from a user",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "user",
          description: "The user to remove tickets from",
          type: ApplicationCommandOptionType.User,
          required: true,
        },
        {
          name: "amount",
          description: "The number of tickets to remove",
          type: ApplicationCommandOptionType.Integer,
          required: true,
        },
      ],
    },
  ],

  callback: async (client, interaction) => {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      await interaction.reply({
        content: "You do not have permission to use this command.",
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const user = interaction.options.getUser("user");
    const guildId = interaction.guild.id;

    let userStats = await UserInviteCount.findOne({
      guildId,
      userId: user.id,
    });

    if (!userStats) {
      userStats = new UserInviteCount({
        guildId,
        userId: user.id,
        tickets: 0,
        weeklyInvites: 0,
        lastResetTimestamp: new Date(),
      });
    }

    switch (subcommand) {
      case "add": {
        const addAmount = interaction.options.getInteger("amount");

        if (addAmount <= 0) {
          await interaction.reply({
            content: "Please provide a positive number.",
            ephemeral: true,
          });
          return;
        }

        userStats.tickets += addAmount;
        userStats.weeklyInvites += addAmount;
        await userStats.save();

        await interaction.reply(
          `Added ${addAmount} ticket(s) to ${user.username}. They now have ${userStats.tickets} ticket(s).`
        );
        break;
      }

      case "remove": {
        const removeAmount = interaction.options.getInteger("amount");

        if (removeAmount <= 0) {
          await interaction.reply({
            content: "Please provide a positive number.",
            ephemeral: true,
          });
          return;
        }

        if (userStats.tickets < removeAmount) {
          await interaction.reply(
            `${user.username} doesn't have enough tickets. They currently have ${userStats.tickets} ticket(s).`
          );
        } else {
          userStats.tickets -= removeAmount;
          userStats.weeklyInvites = Math.max(
            0,
            userStats.weeklyInvites - removeAmount
          ); // Prevent negative weekly invites
          await userStats.save();

          await interaction.reply(
            `Removed ${removeAmount} ticket(s) from ${user.username}. They now have ${userStats.tickets} ticket(s).`
          );
        }
        break;
      }
    }
  },
};
