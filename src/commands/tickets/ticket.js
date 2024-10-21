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
        ephemeral: true, // Makes the reply visible only to the command user
      });
      return;
    }
    const subcommand = interaction.options.getSubcommand();
    const user = interaction.options.getUser("user");
    const guildId = interaction.guild.id;

    let userTickets = await UserInviteCount.findOne({
      guildId,
      userId: user.id,
    });

    if (!userTickets) {
      userTickets = new UserInviteCount({
        guildId,
        userId: user.id,
        tickets: 0,
      });
    }

    switch (subcommand) {
      case "add":
        const addAmount = interaction.options.getInteger("amount");
        userTickets.tickets += addAmount;
        await userTickets.save();
        await interaction.reply(
          `Added ${addAmount} ticket(s) to ${user.username}. They now have ${userTickets.tickets} ticket(s).`
        );
        break;

      case "remove":
        const removeAmount = interaction.options.getInteger("amount");
        if (userTickets.tickets < removeAmount) {
          await interaction.reply(
            `${user.username} doesn't have enough tickets. They currently have ${userTickets.tickets} ticket(s).`
          );
        } else {
          userTickets.tickets -= removeAmount;
          await userTickets.save();
          await interaction.reply(
            `Removed ${removeAmount} ticket(s) from ${user.username}. They now have ${userTickets.tickets} ticket(s).`
          );
        }
        break;
    }
  },
};
