const connectToDatabase = require("../../utils/db");
const InviteModel = require("../../models/inviteSchema");
const giveawaySchema = require("../../models/giveawaySchema");
const cron = require("node-cron");
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
