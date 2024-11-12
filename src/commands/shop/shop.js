const {
  ApplicationCommandOptionType,
  PermissionsBitField,
  EmbedBuilder,
} = require("discord.js");
const ShopItem = require("../../models/shopSchema");

module.exports = {
  name: "shop",
  description: "Manage shop items",
  options: [
    {
      name: "add",
      description: "Add an item to the shop",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "label",
          description: "The name of the item",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "cost",
          description: "The cost of the item in tickets",
          type: ApplicationCommandOptionType.Integer,
          required: true,
        },
        {
          name: "stock",
          description: "Amount of stock (-1 for unlimited)",
          type: ApplicationCommandOptionType.Integer,
          required: true,
        },
        {
          name: "image",
          description: "The image URL for the item",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "description",
          description: "Description of the item",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
    {
      name: "remove",
      description: "Remove an item from the shop",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "label",
          description: "The name of the item to remove",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: "edit",
      description: "Edit an existing shop item",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "label",
          description: "The name of the item to edit",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "new_label",
          description: "New name for the item",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "new_cost",
          description: "New cost for the item",
          type: ApplicationCommandOptionType.Integer,
          required: false,
        },
        {
          name: "new_stock",
          description: "New stock amount (-1 for unlimited)",
          type: ApplicationCommandOptionType.Integer,
          required: false,
        },
        {
          name: "new_image",
          description: "New image URL for the item",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "new_description",
          description: "New description for the item",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
      ],
    },
  ],

  callback: async (client, interaction) => {
    try {
      // Check if user has admin permissions
      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return interaction.reply({
          content: "You do not have permission to manage shop items.",
          ephemeral: true,
        });
      }

      const subcommand = interaction.options.getSubcommand();

      switch (subcommand) {
        case "add": {
          const label = interaction.options.getString("label");
          const cost = interaction.options.getInteger("cost");
          const stock = interaction.options.getInteger("stock");
          const imageUrl = interaction.options.getString("image");
          const description =
            interaction.options.getString("description") ||
            "No description provided";

          // Validate inputs
          if (cost <= 0) {
            return interaction.reply({
              content: "Cost must be greater than 0!",
              ephemeral: true,
            });
          }

          if (stock !== -1 && stock <= 0) {
            return interaction.reply({
              content: "Stock must be either -1 (unlimited) or greater than 0!",
              ephemeral: true,
            });
          }

          // Validate image URL
          try {
            new URL(imageUrl);
          } catch (err) {
            return interaction.reply({
              content: "Please provide a valid image URL!",
              ephemeral: true,
            });
          }

          try {
            // Check if item with same name exists
            const existingItem = await ShopItem.findOne({
              guildId: interaction.guild.id,
              label: label,
            });

            if (existingItem) {
              return interaction.reply({
                content: "An item with this name already exists in the shop!",
                ephemeral: true,
              });
            }

            // Create new shop item
            const newItem = new ShopItem({
              guildId: interaction.guild.id,
              label,
              cost,
              stock,
              imageUrl,
              description,
              createdBy: interaction.user.id,
            });

            await newItem.save();

            // Create embed to show the newly added item
            const embed = new EmbedBuilder()
              .setTitle("New Shop Item Added!")
              .setColor("#00ff00")
              .setThumbnail(imageUrl)
              .addFields(
                { name: "Item Name", value: label, inline: true },
                { name: "Cost", value: `${cost} tickets`, inline: true },
                {
                  name: "Stock",
                  value: stock === -1 ? "Unlimited" : stock.toString(),
                  inline: true,
                },
                { name: "Description", value: description }
              )
              .setFooter({ text: `Added by ${interaction.user.tag}` })
              .setTimestamp();

            await interaction.reply({ embeds: [embed] });
          } catch (error) {
            console.error("Error adding shop item:", error);
            await interaction.reply({
              content: "An error occurred while adding the item to the shop.",
              ephemeral: true,
            });
          }
          break;
        }

        case "remove": {
          const label = interaction.options.getString("label");

          try {
            // Find and remove the item
            const deletedItem = await ShopItem.findOneAndDelete({
              guildId: interaction.guild.id,
              label: label,
            });

            if (!deletedItem) {
              return interaction.reply({
                content: `No item found with the name "${label}"`,
                ephemeral: true,
              });
            }

            // Create embed to show the removed item
            const embed = new EmbedBuilder()
              .setTitle("Shop Item Removed!")
              .setColor("#ff0000")
              .setThumbnail(deletedItem.imageUrl)
              .addFields(
                { name: "Item Name", value: deletedItem.label, inline: true },
                {
                  name: "Cost",
                  value: `${deletedItem.cost} tickets`,
                  inline: true,
                },
                {
                  name: "Stock",
                  value:
                    deletedItem.stock === -1
                      ? "Unlimited"
                      : deletedItem.stock.toString(),
                  inline: true,
                }
              )
              .setFooter({ text: `Removed by ${interaction.user.tag}` })
              .setTimestamp();

            await interaction.reply({ embeds: [embed] });
          } catch (error) {
            console.error("Error removing shop item:", error);
            await interaction.reply({
              content:
                "An error occurred while removing the item from the shop.",
              ephemeral: true,
            });
          }
          break;
        }

        case "edit": {
          const label = interaction.options.getString("label");
          const newLabel = interaction.options.getString("new_label");
          const newCost = interaction.options.getInteger("new_cost");
          const newStock = interaction.options.getInteger("new_stock");
          const newImageUrl = interaction.options.getString("new_image");
          const newDescription =
            interaction.options.getString("new_description");

          try {
            // Find the item
            const item = await ShopItem.findOne({
              guildId: interaction.guild.id,
              label: label,
            });

            if (!item) {
              return interaction.reply({
                content: `No item found with the name "${label}"`,
                ephemeral: true,
              });
            }

            // Validate new values if provided
            if (newCost !== null && newCost <= 0) {
              return interaction.reply({
                content: "New cost must be greater than 0!",
                ephemeral: true,
              });
            }

            if (newStock !== null && newStock !== -1 && newStock <= 0) {
              return interaction.reply({
                content:
                  "New stock must be either -1 (unlimited) or greater than 0!",
                ephemeral: true,
              });
            }

            if (newImageUrl) {
              try {
                new URL(newImageUrl);
              } catch (err) {
                return interaction.reply({
                  content: "Please provide a valid image URL!",
                  ephemeral: true,
                });
              }
            }

            // Check if new label already exists (if changing label)
            if (newLabel && newLabel !== label) {
              const existingItem = await ShopItem.findOne({
                guildId: interaction.guild.id,
                label: newLabel,
              });

              if (existingItem) {
                return interaction.reply({
                  content: `An item with the name "${newLabel}" already exists!`,
                  ephemeral: true,
                });
              }
            }

            // Update the item
            const updates = {
              ...(newLabel && { label: newLabel }),
              ...(newCost !== null && { cost: newCost }),
              ...(newStock !== null && { stock: newStock }),
              ...(newImageUrl && { imageUrl: newImageUrl }),
              ...(newDescription && { description: newDescription }),
            };

            // Only update if there are changes
            if (Object.keys(updates).length === 0) {
              return interaction.reply({
                content: "No changes provided to update the item.",
                ephemeral: true,
              });
            }

            const updatedItem = await ShopItem.findOneAndUpdate(
              { guildId: interaction.guild.id, label: label },
              updates,
              { new: true }
            );

            // Create embed to show the updated item
            const embed = new EmbedBuilder()
              .setTitle("Shop Item Updated!")
              .setColor("#0000ff")
              .setThumbnail(updatedItem.imageUrl)
              .addFields(
                { name: "Item Name", value: updatedItem.label, inline: true },
                {
                  name: "Cost",
                  value: `${updatedItem.cost} tickets`,
                  inline: true,
                },
                {
                  name: "Stock",
                  value:
                    updatedItem.stock === -1
                      ? "Unlimited"
                      : updatedItem.stock.toString(),
                  inline: true,
                },
                { name: "Description", value: updatedItem.description }
              )
              .setFooter({ text: `Updated by ${interaction.user.tag}` })
              .setTimestamp();

            await interaction.reply({ embeds: [embed] });
          } catch (error) {
            console.error("Error updating shop item:", error);
            await interaction.reply({
              content: "An error occurred while updating the shop item.",
              ephemeral: true,
            });
          }
          break;
        }
      }
    } catch (e) {
      console.log(e);
    }
  },
};
