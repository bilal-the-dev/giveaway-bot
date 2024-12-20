require("dotenv").config();
const { Client, IntentsBitField } = require("discord.js");
const eventHandler = require("./handlers/eventHandler");
const inviteSchema = require("./models/inviteSchema");
const memberSchema = require("./models/memberSchema");
const UserInviteCount = require("./models/memberSchema");
const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildInvites,
  ],
});

eventHandler(client);

client.on("inviteCreate", async (invite) => {
  await inviteSchema.create({
    guildId: invite.guild.id,
    code: invite.code,
    uses: invite.uses,
    inviterId: invite.inviter.id,
  });
});

client.on("guildMemberAdd", async (member) => {
  const guildInvites = await member.guild.invites.fetch();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  if (member.user.createdAt > sixMonthsAgo) {
    console.log(
      `${member.user.tag} was kicked: Account younger than 6 months.`
    );
    await member.kick(
      "Account must be at least 6 months old to join this server."
    );
    return;
  }

  for (const invite of guildInvites.values()) {
    const storedInvite = await inviteSchema.findOne({
      guildId: member.guild.id,
      code: invite.code,
    });

    if (storedInvite && invite.uses > storedInvite.uses) {
      let userInviteCount = await UserInviteCount.findOne({
        guildId: member.guild.id,
        userId: invite.inviter.id,
      });

      if (userInviteCount && userInviteCount.hasJoined) {
        console.log(
          `${member.user.tag} rejoined, but they have already been awarded tickets previously.`
        );
        return;
      }

      await inviteSchema.findOneAndUpdate(
        { guildId: member.guild.id, code: invite.code },
        { uses: invite.uses }
      );

      const randomTickets = Math.floor(Math.random() * 5) + 1;

      const updatedInviteCount = await UserInviteCount.findOneAndUpdate(
        { guildId: member.guild.id, userId: invite.inviter.id },
        { $inc: { tickets: randomTickets, weeklyInvites: 1 }, hasJoined: true },
        { upsert: true, new: true }
      );

      const inviterName = invite.inviter.username;
      console.log(
        `${member.user.tag} joined using invite from ${inviterName}. ${inviterName} now has ${updatedInviteCount.tickets} ticket(s) after receiving ${randomTickets} ticket(s).`
      );
      return;
    }
  }

  console.log(
    `${member.user.tag} joined but I couldn't find which invite they used.`
  );
});
const messageCooldowns = new Map();
client.on("messageCreate", handleMessage);

async function handleMessage(message) {
  try {
    if (message.author.bot) return;

    const cooldownTime = 2000; // 5 seconds cooldown
    const now = Date.now();

    if (messageCooldowns.has(message.author.id)) {
      const lastMessageTime = messageCooldowns.get(message.author.id);

      if (now - lastMessageTime < cooldownTime) {
        // User is still on cooldown, ignore the message
        return;
      }
    }

    // Update the cooldown timestamp for the user
    messageCooldowns.set(message.author.id, now);

    await UserInviteCount.findOneAndUpdate(
      {
        guildId: message.guild.id,
        userId: message.author.id,
      },
      {
        $inc: { weeklyMessages: 1 },
        $setOnInsert: {
          tickets: 0,
          weeklyInvites: 0,
          lastResetTimestamp: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
      }
    );
  } catch (error) {
    console.error("Error tracking message:", error);
  }
}
client.login(process.env.TOKEN);
