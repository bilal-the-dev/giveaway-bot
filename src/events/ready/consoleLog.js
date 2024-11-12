const connectToDatabase = require("../../utils/db");
const InviteModel = require("../../models/inviteSchema");
const giveawaySchema = require("../../models/giveawaySchema");
const cron = require("node-cron");

const notificationChannelId = process.env.NOTIFICATION_CHANNEL_ID;
const UserInviteCount = require("../../models/memberSchema");
const createEmbed = require("../../utils/embedHandler");
module.exports = async (client) => {
  console.log(`${client.user.tag} is online.`);
  await connectToDatabase();

  for (const guild of client.guilds.cache.values()) {
    const guildInvites = await guild.invites.fetch();
    for (const invite of guildInvites.values()) {
      await InviteModel.findOneAndUpdate(
        { guildId: guild.id, code: invite.code },
        { uses: invite.uses, inviterId: invite.inviter.id },
        { upsert: true, new: true }
      );
    }
  }
  initializeMessageTracking(client);

  cron.schedule("* * * * *", async () => {
    const now = new Date();

    const giveaways = await giveawaySchema.find({
      isActive: true,
      endTime: { $lte: now },
    });

    giveaways.forEach(async (giveaway) => {
      await endGiveaway(giveaway._id, client);
    });
  });

  cron.schedule(
    "0 0 * * 0",
    async () => {
      console.log("Running weekly leaderboard reset...");
      const guilds = client.guilds.cache;

      for (const [guildId, guild] of guilds) {
        try {
          // Only fetch users who have actually made invites
          const topUsers = await UserInviteCount.find({
            guildId,
            weeklyInvites: { $gt: 0 }, // Only get users with invites > 0
          })
            .sort("-weeklyInvites")
            .limit(10);

          console.log(`Guild ${guildId} - Users with invites:`, topUsers);
          let totalRewards = 0;

          // Process rewards only if there are users with invites
          if (topUsers.length > 0) {
            for (let i = 0; i < topUsers.length; i++) {
              const user = await client.users.fetch(topUsers[i].userId);
              let bonusTickets = 0;

              // Assign rewards based on position
              if (i < 2) bonusTickets = 50;
              else if (i < 5) bonusTickets = 25;
              else if (i < 8) bonusTickets = 15;
              else bonusTickets = 10;

              totalRewards += bonusTickets;

              // Log the reward assignment
              console.log(
                `Rewarding user ${user.tag} with ${bonusTickets} tickets for ${topUsers[i].weeklyInvites} invites`
              );

              // Update user's tickets and reset their weekly invites
              await UserInviteCount.findByIdAndUpdate(topUsers[i]._id, {
                $inc: { tickets: bonusTickets },
                $set: { weeklyInvites: 0 },
              });

              await sendLeaderboardRewardsNotification(
                client,
                guildId,
                topUsers,
                notificationChannelId
              );
            }
          } else {
            console.log(`No users with invites found in guild ${guildId}`);
          }

          // Reset weekly invites for all users
          await UserInviteCount.updateMany(
            { guildId },
            { $set: { weeklyInvites: 0 } }
          );
        } catch (error) {
          console.error(
            `Error resetting leaderboard for guild ${guildId}:`,
            error
          );
        }
      }

      console.log("Weekly leaderboard reset completed.");
    },
    {
      timezone: "UTC",
    }
  );
};

async function endGiveaway(giveawayId, client) {
  try {
    const giveaway = await giveawaySchema.findById(giveawayId);
    const notificationChannelId = process.env.NOTIFICATION_CHANNEL_ID;
    if (!giveaway || !giveaway.isActive) return;
    giveaway.isActive = false;
    await giveaway.save();

    const ticketPool = [];
    giveaway.participants.forEach((participant) => {
      for (let i = 0; i < participant.tickets; i++) {
        ticketPool.push(participant.userId);
      }
    });

    if (ticketPool.length === 0) {
      const channel = await client.channels.fetch(giveaway.channelId);
      await channel.send(
        `The giveaway **${giveaway.label}** ended, but no participants entered.`
      );
      return;
    }

    console.log(ticketPool);
    const winnerIndex = Math.floor(Math.random() * ticketPool.length);
    const winnerId = ticketPool[winnerIndex];

    const winner = await client.users.fetch(winnerId);
    const totalTickets = ticketPool.length;
    const uniqueParticipants = new Set(ticketPool).size;
    const winnerTicketCount = ticketPool.filter((id) => id === winnerId).length;
    const winningChance = ((winnerTicketCount / totalTickets) * 100).toFixed(2);

    // Create winner notification embed
    const winnerEmbed = createEmbed({
      title: "🎉 Giveaway Winner Announcement!",
      description: `
> \`\`\`
> 🎁 Prize: ${giveaway.label}
> 👑 Winner: ${winner.tag}
> 🎫 Winner's Tickets: ${winnerTicketCount}
> 🎯 Winning Chance: ${winningChance}%
> \`\`\`
> **Giveaway Statistics:**
> \`\`\`
> 👥 Total Participants: ${uniqueParticipants}
> 🎟️ Total Tickets: ${totalTickets}
> \`\`\`
    `,
      color: "#FFD700",
      thumbnailUrl: winner.displayAvatarURL({ dynamic: true }),
    });
    const channel = await client.channels.fetch(giveaway.channelId);
    try {
      await winner.send(
        `Congratulations! You've won the **${giveaway.label}** giveaway! Please contact the server admin.`
      );
    } catch (err) {
      await channel.send(
        `⚠️ <@${winnerId}>, I couldn't DM you the winning confirmation. Please enable DMs to receive important prize claim information!`
      );
    }

    await channel.send(
      `The giveaway **${giveaway.label}** has ended! The winner is <@${winnerId}>.`
    );

    const notificationChannel = await client.channels.cache.get(
      notificationChannelId
    );
    if (notificationChannel && notificationChannel.id !== giveaway.channelId) {
      await notificationChannel.send({ embeds: [winnerEmbed] });
    }
  } catch (e) {
    console.error("Error in giveaway end handler:", error);
  }
}

function initializeMessageTracking(client) {
  cron.schedule(
    "0 0 * * 0",
    async () => {
      console.log("Running weekly message leaderboard reset...");
      const guilds = client.guilds.cache;

      for (const [guildId, guild] of guilds) {
        try {
          // Get top 10 users who actually sent messages this week
          const topUsers = await UserInviteCount.find({
            guildId,
            weeklyMessages: { $gt: 0 },
          })
            .sort("-weeklyMessages")
            .limit(10);

          console.log(`Guild ${guildId} - Users with messages:`, topUsers);

          if (topUsers.length > 0) {
            let totalRewards = 0;
            for (let i = 0; i < topUsers.length; i++) {
              const user = await client.users.fetch(topUsers[i].userId);
              let bonusTickets = 0;

              if (i < 2) bonusTickets = 30;
              else if (i < 5) bonusTickets = 20;
              else if (i < 8) bonusTickets = 10;
              else bonusTickets = 5;

              totalRewards += bonusTickets;

              console.log(
                `Rewarding user ${user.tag} with ${bonusTickets} tickets for ${topUsers[i].weeklyMessages} messages`
              );

              await UserInviteCount.findByIdAndUpdate(topUsers[i]._id, {
                $inc: { tickets: bonusTickets },
                $set: { weeklyMessages: 0 },
              });
            }
            await sendMessageLeaderboardNotification(
              client,
              guildId,
              topUsers,
              notificationChannelId
            );
          } else {
            console.log(`No users with messages found in guild ${guildId}`);
          }

          await UserInviteCount.updateMany(
            { guildId },
            { $set: { weeklyMessages: 0 } }
          );
        } catch (error) {
          console.error(
            `Error resetting message leaderboard for guild ${guildId}:`,
            error
          );
        }
      }

      console.log("Weekly message leaderboard reset completed.");
    },
    {
      timezone: "UTC",
    }
  );
}

async function sendLeaderboardRewardsNotification(
  client,
  guildId,
  topUsers,
  notificationChannelId
) {
  try {
    // Skip if no users found
    if (!topUsers || topUsers.length === 0) {
      console.log(`No users to reward in guild ${guildId}`);
      return;
    }

    const rewardTiers = {
      "🥇 Top 2": "50 tickets",
      "🥈 Top 3-5": "25 tickets",
      "🥉 Top 6-8": "15 tickets",
      "🎖️ Top 9-10": "10 tickets",
    };

    // Generate winners list with formatting
    let winnersText = "";
    let totalRewards = 0;

    for (let i = 0; i < topUsers.length; i++) {
      const user = await client.users.fetch(topUsers[i].userId);
      let bonusTickets = i < 2 ? 50 : i < 5 ? 25 : i < 8 ? 15 : 10;
      totalRewards += bonusTickets;

      const position = i + 1;
      const medal =
        position === 1
          ? "👑"
          : position === 2
          ? "🥈"
          : position === 3
          ? "🥉"
          : "🎖️";

      winnersText += `${medal} **#${position}** <@${user.id}>\n\`\`\`
• Invites: ${topUsers[i].weeklyInvites}
• Reward: ${bonusTickets} tickets\`\`\`\n`;
    }

    // Create rewards summary embed
    const rewardsEmbed = createEmbed({
      title: "🏆 Weekly Invites Leaderboard Results!",
      description: `
> 📢 **Weekly Leaderboard Winners Announced!**
> **Reward Tiers:**
\`\`\`
🥇 Top 2: 50 tickets each
🥈 Top 3-5: 25 tickets each
🥉 Top 6-8: 15 tickets each
🎖️ Top 9-10: 10 tickets each
\`\`\`
**🎉 Winners & Rewards:**
${winnersText}
          `,
      color: "#FFA500",
      footer: "Next rewards in 7 days! Keep inviting! 🎯",
    });

    // Send to notification channel
    const notificationChannel = await client.channels.cache.get(
      notificationChannelId
    );
    if (notificationChannel) {
      await notificationChannel.send({ embeds: [rewardsEmbed] });
    }
  } catch (error) {
    console.error("Error sending leaderboard rewards notification:", error);
  }
}

async function sendMessageLeaderboardNotification(
  client,
  guildId,
  topUsers,
  notificationChannelId
) {
  try {
    // Skip if no users found
    if (!topUsers || topUsers.length === 0) {
      console.log(`No active message users to reward in guild ${guildId}`);
      return;
    }

    // Generate winners list with formatting
    let winnersText = "";
    let totalRewards = 0;
    let totalMessages = 0;

    for (let i = 0; i < topUsers.length; i++) {
      const user = await client.users.fetch(topUsers[i].userId);
      let bonusTickets = i < 2 ? 30 : i < 5 ? 20 : i < 8 ? 10 : 5;
      totalRewards += bonusTickets;
      totalMessages += topUsers[i].weeklyMessages;

      const position = i + 1;
      const medal =
        position === 1
          ? "👑"
          : position === 2
          ? "🥈"
          : position === 3
          ? "🥉"
          : "🎖️";

      winnersText += `${medal} **#${position}** <@${user.id}>\n\`\`\`
• Messages: ${topUsers[i].weeklyMessages.toLocaleString()}
• Reward: ${bonusTickets} tickets\`\`\`\n`;
    }

    // Create message leaderboard embed
    const messageLeaderboardEmbed = createEmbed({
      title: "💬 Weekly Message Leaderboard Results!",
      description: `
> 📢 **Weekly Chat Champions Announced!**
> **Reward Tiers:**
\`\`\`
👑 Top 2: 30 tickets each
🥈 Top 3-5: 20 tickets each
🥉 Top 6-8: 10 tickets each
🎖️ Top 9-10: 5 tickets each
\`\`\`
**🏆 Top Chatters & Rewards:**
>
${winnersText}
          `,
      color: "#4169E1", // Royal Blue
      footer: "New weekly competition starts now! Keep chatting! 💭",
      timestamp: Date.now(),
    });

    const notificationChannel = await client.channels.cache.get(
      notificationChannelId
    );
    if (notificationChannel) {
      await notificationChannel.send({ embeds: [messageLeaderboardEmbed] });
    }
  } catch (error) {
    console.error("Error sending message leaderboard notification:", error);
  }
}
