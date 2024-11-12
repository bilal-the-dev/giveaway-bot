const { EmbedBuilder } = require("discord.js");
const UserInviteCount = require("../../models/memberSchema");
module.exports = async (client, message) => {
  if (!message.author.bot && message.content.startsWith("!ticket")) {
    const args = message.content.slice("!ticket".length).trim().split(/ +/);

    const user = message.mentions.users.first(); // Get the mentioned user
    if (!user) return message.reply("Please mention a valid user.");

    const guildId = message.guild.id;

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
      await userTickets.save();
    }

    message.reply(`${user.username} has ${userTickets.tickets} ticket(s).`);
  } else if (
    message.content.startsWith("!leaderboard") &&
    !message.author.bot
  ) {
    const guildId = message.guild.id;

    const replyMessage = await message.channel.send(
      "Fetching the leaderboard..."
    );

    // Fetch top 10 users
    const topUsers = await UserInviteCount.find({ guildId })
      .sort("-weeklyInvites")
      .limit(10);

    const embed = new EmbedBuilder()
      .setTitle("🏆 Weekly Invite Leaderboard 🏆")
      .setColor("#FFD700") // Gold color
      .setDescription("Top 10 inviters of the week:")
      .setTimestamp()
      .setFooter({ text: "Leaderboard resets every Sunday at midnight UTC" });

    if (topUsers.length === 0) {
      embed.setDescription(
        "No invites recorded this week yet. Start inviting to climb the ranks!"
      );
    } else {
      for (let i = 0; i < topUsers.length; i++) {
        const user = await message.client.users.fetch(topUsers[i].userId);
        let medal = "";
        if (i === 0) medal = "🥇";
        else if (i === 1) medal = "🥈";
        else if (i === 2) medal = "🥉";

        embed.addFields({
          name: `${medal} ${i + 1}. ${user.username}`,
          value: `Invites: ${topUsers[i].weeklyInvites} | Total Tickets: ${topUsers[i].tickets}`,
        });
      }
    }
    await replyMessage.edit({ content: null, embeds: [embed] });
  } else if (
    message.content.toLowerCase() === "!msgleaderboard" &&
    !message.author.bot
  ) {
    const guildId = message.guild.id;

    const replyMessage = await message.channel.send(
      "Fetching the leaderboard..."
    );

    // Fetch top 10 users by weekly messages
    const topUsers = await UserInviteCount.find({ guildId })
      .sort("-weeklyMessages")
      .limit(10);

    const embed = new EmbedBuilder()
      .setTitle("📝 Weekly Message Leaderboard")
      .setColor("#1abc9c")
      .setDescription("Top 10 most active chatters this week:")
      .setTimestamp()
      .setFooter({ text: "Leaderboard resets every Sunday at midnight UTC" });

    if (topUsers.length === 0) {
      embed.setDescription("No messages recorded this week yet!");
    } else {
      for (let i = 0; i < topUsers.length; i++) {
        const user = await message.client.users.fetch(topUsers[i].userId);
        let position = "";
        if (i === 0) position = "🥇";
        else if (i === 1) position = "🥈";
        else if (i === 2) position = "🥉";
        else position = `${i + 1}.`;

        embed.addFields({
          name: `${position} ${user.username}`,
          value: `Messages: ${topUsers[i].weeklyMessages}`,
        });
      }
    }

    await replyMessage.edit({ content: null, embeds: [embed] });
  } else if (message.content.startsWith("!msgcount") && !message.author.bot) {
    try {
      const targetUser = message.mentions.users.first();

      // If no user was mentioned, send an error message
      if (!targetUser) {
        return message.channel.send(
          "Please mention a user to check their weekly message count. Example: `!msgCount @user`"
        );
      }

      console.log("here");

      const userId = targetUser.id;
      const guildId = message.guild.id;

      try {
        // Fetch the mentioned user's message count from the database
        let userRecord = await UserInviteCount.findOne({ guildId, userId });
        console.log(userRecord);
        // If the user doesn't have a record, create a default one
        if (!userRecord) {
          userRecord = new UserInviteCount({ guildId, userId });
          await userRecord.save();
        }

        const weeklyMessages = userRecord.weeklyMessages;

        const embed = new EmbedBuilder()
          .setColor("#FFA500") // Orange color for the embed
          .setTitle("📊 Weekly Message Count")
          .setDescription(
            `Here is the message count for ${targetUser.username} this week!`
          )
          .addFields({
            name: "Messages Sent",
            value: `\`${weeklyMessages}\` 📩`,
            inline: true,
          }) // Use addFields for the message count
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true })) // User's avatar
          .setFooter({
            text: `Requested by ${message.author.username}`,
            iconURL: message.author.displayAvatarURL({ dynamic: true }),
          })
          .setTimestamp(); // Adds the current timestamp

        await message.channel.send({ embeds: [embed] });
      } catch (e) {
        console.log(e);
      }
    } catch (error) {
      console.error("Error fetching message count:", error);
      message.channel.send(
        "An error occurred while fetching the message count. Please try again later."
      );
    }
  } else if (message.content.startsWith("!top") && !message.author.bot) {
    try {
      // Fetch the top 50 users sorted by ticket count in descending order
      const topUsers = await UserInviteCount.find({ guildId: message.guild.id })
        .sort({ tickets: -1 })
        .limit(50);

      if (!topUsers.length) {
        return message.channel.send("No users found with tickets.");
      }

      // Create a formatted leaderboard string
      let leaderboard = "";
      topUsers.forEach((user, index) => {
        leaderboard += `\`#${index + 1}\` <@${user.userId}> - **${
          user.tickets
        } tickets**\n`;
      });

      // Create an embed using EmbedBuilder
      const embed = new EmbedBuilder()
        .setTitle("🎟️ Top 50 Ticket Holders")
        .setColor("#FFD700")
        .setDescription(
          "> Here are the top 50 users with the highest tickets in the server!\n\n" +
            leaderboard
        );

      // Send the embedded message to the channel
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("Error fetching top users:", error);
      message.channel.send("An error occurred while retrieving the top users.");
    }
  }
};
