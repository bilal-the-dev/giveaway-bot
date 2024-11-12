const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const ShopItem = require("../../models/shopSchema");
const UserInviteCount = require("../../models/memberSchema");
const createEmbed = require("../../utils/embedHandler");
// Utility function to format number with commas
const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Function to create shop embed for a single item
const createShopEmbed = (item, page, totalPages, guildName) => {
  const embed = new EmbedBuilder()
    .setTitle(`🛍️ ${guildName}'s Shop`)
    .setColor("#ffd700")
    .setImage(item.imageUrl)
    .addFields(
      {
        name: `${item.label}`,
        value: `${item.description}`,
        inline: false,
      },
      {
        name: "💵 Price",
        value: `\`${formatNumber(item.cost)}\` 🎫`,
        inline: true,
      },
      {
        name: "📦 Stock",
        value: item.stock === -1 ? "Unlimited" : `${item.stock} remaining`,
        inline: true,
      }
    )
    .setDescription(
      `
  > Type \`!buy ${item.label}\` to purchase this item.
      `
    )
    .setFooter({
      text: `💫 Page ${page}/${totalPages} • Use !help shop for more info`,
    })
    .setTimestamp();

  return embed;
};

// Create navigation buttons
const createButtons = (currentPage, totalPages) => {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("prev")
      .setEmoji("◀️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage === 1),
    new ButtonBuilder()
      .setCustomId("next")
      .setEmoji("▶️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage === totalPages)
  );

  return row;
};

module.exports = async (client, message) => {
  if (!message.author.bot && message.content.startsWith("!shop")) {
    try {
      // Fetch all items for this guild
      const items = await ShopItem.find({
        guildId: message.guild.id,
      }).sort({ cost: 1 }); // Sort by cost ascending

      if (!items.length) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription("❌ There are currently no items in the shop!")
              .setColor("#ff0000"),
          ],
        });
      }

      let currentPage = 1;
      const totalPages = items.length;

      // Create initial embed and buttons
      const embed = createShopEmbed(
        items[currentPage - 1],
        currentPage,
        totalPages,
        message.guild.name
      );
      const buttons = createButtons(currentPage, totalPages);

      // Send initial message
      const shopMessage = await message.channel.send({
        embeds: [embed],
        components: totalPages > 1 ? [buttons] : [],
      });

      // If only one item, no need for collector
      if (totalPages <= 1) return;

      // Create button collector
      const collector = shopMessage.createMessageComponentCollector({
        filter: (i) => i.user.id === message.author.id,
        time: 120000, // 2 minutes
      });

      collector.on("collect", async (interaction) => {
        // Update current page based on button clicked
        if (interaction.customId === "prev") {
          currentPage--;
        } else if (interaction.customId === "next") {
          currentPage++;
        }

        // Create new embed and buttons for current page
        const newEmbed = createShopEmbed(
          items[currentPage - 1],
          currentPage,
          totalPages,
          message.guild.name
        );
        const newButtons = createButtons(currentPage, totalPages);

        // Update message
        await interaction.update({
          embeds: [newEmbed],
          components: [newButtons],
        });
      });

      collector.on("end", () => {
        // Disable all buttons when collector ends
        const disabledButtons = createButtons(currentPage, totalPages);
        disabledButtons.components.forEach((button) =>
          button.setDisabled(true)
        );

        shopMessage
          .edit({
            components: [disabledButtons],
          })
          .catch(console.error);
      });
    } catch (error) {
      console.error("Error in shop command:", error);
      message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription("❌ An error occurred while fetching shop items.")
            .setColor("#ff0000"),
        ],
      });
    }
  } else if (!message.author.bot && message.content.startsWith("!buy")) {
    try {
      const args = message.content.slice("!buy".length).trim().split(/ +/);
      const itemName = args.join(" ").toLowerCase();
      const guildId = message.guild.id;
      const userId = message.author.id;
      const notificationChannelId = process.env.NOTIFICATION_CHANNEL_ID;

      if (!itemName) {
        return message.reply(
          "❌ Please specify an item to buy! Usage: `!buy <item name>`"
        );
      }

      try {
        // Find the shop item
        const shopItem = await ShopItem.findOne({
          guildId: guildId,
          label: { $regex: new RegExp(itemName, "i") },
        });

        if (!shopItem) {
          return message.reply(
            "❌ Item not found in the shop! Please check the item name and try again."
          );
        }

        // Get user's ticket balance
        const userInviteCount = await UserInviteCount.findOne({
          guildId: guildId,
          userId: userId,
        });

        if (!userInviteCount || userInviteCount.tickets < shopItem.cost) {
          return message.reply(
            `❌ Insufficient tickets! Required: \`${
              shopItem.cost
            }\` tickets, You have: \`${
              userInviteCount?.tickets || 0
            }\` tickets.`
          );
        }

        if (shopItem.stock !== -1 && shopItem.stock <= 0) {
          return message.reply("❌ This item is out of stock!");
        }

        // Process the purchase
        await UserInviteCount.findOneAndUpdate(
          { guildId: guildId, userId: userId },
          { $inc: { tickets: -shopItem.cost } }
        );

        if (shopItem.stock !== -1) {
          await ShopItem.findByIdAndUpdate(shopItem._id, {
            $inc: { stock: -1 },
          });
        }

        // Create purchase confirmation embed
        const purchaseEmbed = createEmbed({
          title: "🛍️ Purchase Successful!",
          description: `
> 🎉 **Congratulations on your purchase!**
> 
> **Item Details:**
> \`\`\`
> 📦 Item: ${shopItem.label}
> 💰 Cost: ${shopItem.cost} tickets
> 🎫 Remaining Balance: ${userInviteCount.tickets - shopItem.cost} tickets
> \`\`\`
> **Next Steps:**
> 📍 Contact a server admin to claim your purchase
> 📍 Keep your DM confirmation as proof
            `,
          color: "#00FF00",
          fields: [
            {
              name: "📅 Purchase Time",
              value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
              inline: false,
            },
          ],
          footer: "Thank you for your purchase! 🌟",
          timestamp: Date.now(),
        });

        // Create DM confirmation embed
        const dmEmbed = createEmbed({
          title: "🎉 Purchase Confirmation",
          description: `
> 📢 **Purchase Successful in ${message.guild.name}!**
> **Purchase Details:**
> \`\`\`
> 📦 Item: ${shopItem.label}
> 💰 Cost: ${shopItem.cost} tickets
> 🎫 Remaining Balance: ${userInviteCount.tickets - shopItem.cost} tickets
> \`\`\`
> ⚠️ **Important Information:**
> 📍 Please contact a server admin to claim your item
> 📍 Save this message as your proof of purchase
            `,
          color: "#FFD700",
          footer: "Keep this message for your records 📋",
          timestamp: Date.now(),
        });

        // Create notification embed for the notification channel
        const notificationEmbed = createEmbed({
          title: "🛒 New Purchase Alert!",
          description: `
> 🎯 **New Purchase Made!**
> 
> **Transaction Details:**
> \`\`\`
> 👤 Buyer: ${message.author.tag}
> 📦 Item: ${shopItem.label}
> 💰 Price: ${shopItem.cost} tickets
> \`\`\`
${
  shopItem.stock !== -1
    ? `> 📊 **Remaining Stock:** ${shopItem.stock - 1}`
    : "> 📊 **Stock:** Unlimited"
}
            `,
          color: "#9B59B6",
          thumbnailUrl: message.author.displayAvatarURL({ dynamic: true }),
          footer: `Transaction ID: ${Date.now()}`,
          timestamp: Date.now(),
        });

        // Send all embeds
        await message.reply({ embeds: [purchaseEmbed] });

        try {
          await message.author.send({ embeds: [dmEmbed] });
        } catch (err) {
          await message.channel.send(
            `⚠️ ${message.author}, I couldn't send you the DM confirmation. Please enable DMs for complete purchase details.`
          );
        }

        // Send notification to the notification channel
        const notificationChannel = await message.guild.channels.cache.get(
          notificationChannelId
        );
        if (notificationChannel) {
          await notificationChannel.send({ embeds: [notificationEmbed] });
        }
      } catch (error) {
        console.error("Error in buy command:", error);
        await message.reply(
          "❌ An error occurred while processing your purchase. Please try again later."
        );
      }
    } catch (e) {
      console.log(e);
    }
  }
};
