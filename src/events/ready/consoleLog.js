const connectToDatabase = require("../../utils/db");
const InviteModel = require("../../models/inviteSchema");
const giveawaySchema = require("../../models/giveawaySchema");
const cron = require("node-cron");
const UserInviteCount = require("../../models/memberSchema");
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
              if (i < 2) bonusTickets = 75;
              else if (i < 5) bonusTickets = 50;
              else if (i < 8) bonusTickets = 25;
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
  const giveaway = await giveawaySchema.findById(giveawayId);
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
  await winner.send(
    `Congratulations! You've won the **${giveaway.label}** giveaway! Please contact the server admin.`
  );

  const channel = await client.channels.fetch(giveaway.channelId);
  await channel.send(
    `The giveaway **${giveaway.label}** has ended! The winner is <@${winnerId}>.`
  );
}

function initializeMessageTracking(client) {
  // Schedule reset for every Sunday at midnight UTC
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
