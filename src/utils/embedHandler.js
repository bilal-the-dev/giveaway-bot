const { EmbedBuilder } = require("discord.js");

/**
 * Creates a customized embed with optional and required parameters
 * @param {Object} options - The options for the embed
 * @param {string} options.title - The title of the embed (Required)
 * @param {string} [options.description] - The description of the embed
 * @param {string} [options.url] - The URL of the embed
 * @param {string} [options.thumbnailUrl] - The thumbnail URL
 * @param {string} [options.imageUrl] - The image URL
 * @param {string} [options.color] - The color of the embed (hex code or color name)
 * @param {Object[]} [options.fields] - Array of fields to add
 * @param {string} [options.footer] - Footer text
 * @param {string} [options.footerIconUrl] - Footer icon URL
 * @param {string} [options.author] - Author name
 * @param {string} [options.authorIconUrl] - Author icon URL
 * @param {string} [options.authorUrl] - Author URL
 * @param {number} [options.timestamp] - Timestamp (Date.now() or custom timestamp)
 * @returns {EmbedBuilder} The constructed embed
 */
function createEmbed({
  title, // Required
  description,
  url,
  thumbnailUrl,
  imageUrl,
  color = "#0099ff", // Default color
  fields = [],
  footer,
  footerIconUrl,
  author,
  authorIconUrl,
  authorUrl,
  timestamp,
}) {
  // Validate required parameters
  if (!title) {
    throw new Error("Embed title is required");
  }

  // Create new embed
  const embed = new EmbedBuilder().setTitle(title).setColor(color);

  // Add optional components if they exist
  if (description) embed.setDescription(description);
  if (url) embed.setURL(url);
  if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);
  if (imageUrl) embed.setImage(imageUrl);

  // Add fields if they exist
  if (fields.length > 0) {
    fields.forEach((field) => {
      if (field.name && field.value) {
        embed.addFields({
          name: field.name,
          value: field.value,
          inline: field.inline ?? false,
        });
      }
    });
  }

  // Add footer if provided
  if (footer) {
    embed.setFooter({
      text: footer,
      iconURL: footerIconUrl,
    });
  }

  // Add author if provided
  if (author) {
    embed.setAuthor({
      name: author,
      iconURL: authorIconUrl,
      url: authorUrl,
    });
  }

  // Add timestamp if provided
  if (timestamp) {
    embed.setTimestamp(timestamp);
  }

  return embed;
}

module.exports = createEmbed;
