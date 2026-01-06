require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, SlashCommandBuilder, Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// === CONFIG ===
const ADMIN_ROLE_ID = 'ID_ROLE_ADMIN'; // Remplace par ton rôle admin
const WHITELIST_CHANNEL_ID = 'ID_CANAL_WHITELIST'; // Remplace par ton canal pour recevoir les candidatures

// === Serveur Express pour Render ===
const app = express();
app.get('/', (req, res) => res.send('NOXVELOCITY BOT ONLINE'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// === Client Discord ===
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// === Commandes Slash ===
const commands = [
  new SlashCommandBuilder()
    .setName('post-whitelist')
    .setDescription('Poste le formulaire pour rejoindre NOXVELOCITY'),
  new SlashCommandBuilder()
    .setName('accept')
    .setDescription('Accepte un joueur à la whitelist')
    .addStringOption(opt => opt.setName('pseudo').setDescription('Pseudo du joueur').setRequired(true)),
  new SlashCommandBuilder()
    .setName('deny')
    .setDescription('Refuse un joueur à la whitelist')
    .addStringOption(opt => opt.setName('pseudo').setDescription('Pseudo du joueur').setRequired(true)),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Liste toutes les commandes')
].map(cmd => cmd.toJSON());

// Enregistrement des commandes
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ Commandes slash enregistrées');
  } catch (err) { console.error(err); }
})();

// === Ready Event ===
client.once('ready', () => console.log(`🏁 NOXVELOCITY BOT CONNECTÉ : ${client.user.tag}`));

// === Interaction Event ===
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isModalSubmit()) return;

  // /help
  if (interaction.isChatInputCommand() && interaction.commandName === 'help') {
    return interaction.reply({
      content: `**Commandes NOXVELOCITY**\n
/post-whitelist → Post le formulaire de candidature\n
/accept → Accepter un joueur (Admin)\n
/deny → Refuser un joueur (Admin)\n
/help → Affiche cette aide`,
      ephemeral: true
    });
  }

  // /post-whitelist
  if (interaction.isChatInputCommand() && interaction.commandName === 'post-whitelist') {
    const modal = new ModalBuilder()
      .setCustomId('whitelistModal')
      .setTitle('Formulaire Whitelist NOXVELOCITY');

    const nameInput = new TextInputBuilder().setCustomId('fullName').setLabel("Prénom et Nom").setStyle(TextInputStyle.Short).setRequired(true);
    const pseudoInput = new TextInputBuilder().setCustomId('pseudo').setLabel("Pseudo").setStyle(TextInputStyle.Short).setRequired(true);
    const reasonInput = new TextInputBuilder().setCustomId('reason').setLabel("Pourquoi rejoindre le projet ?").setStyle(TextInputStyle.Paragraph).setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nameInput),
      new ActionRowBuilder().addComponents(pseudoInput),
      new ActionRowBuilder().addComponents(reasonInput)
    );

    return interaction.showModal(modal);
  }

  // Modal submission
  if (interaction.isModalSubmit() && interaction.customId === 'whitelistModal') {
    const fullName = interaction.fields.getTextInputValue('fullName');
    const pseudo = interaction.fields.getTextInputValue('pseudo');
    const reason = interaction.fields.getTextInputValue('reason');

    const channel = client.channels.cache.get(WHITELIST_CHANNEL_ID);
    if (channel) channel.send(`**Nouvelle candidature**\nNom : ${fullName}\nPseudo : ${pseudo}\nMotif : ${reason}`);

    return interaction.reply({ content: 'Votre candidature a été envoyée !', ephemeral: true });
  }

  // /accept
  if (interaction.isChatInputCommand() && interaction.commandName === 'accept') {
    if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID))
      return interaction.reply({ content: "❌ Vous n'avez pas la permission", ephemeral: true });

    const pseudo = interaction.options.getString('pseudo');
    return interaction.reply({ content: `✅ Le joueur **${pseudo}** a été accepté dans la whitelist !`, ephemeral: true });
  }

  // /deny
  if (interaction.isChatInputCommand() && interaction.commandName === 'deny') {
    if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID))
      return interaction.reply({ content: "❌ Vous n'avez pas la permission", ephemeral: true });

    const pseudo = interaction.options.getString('pseudo');
    return interaction.reply({ content: `❌ Le joueur **${pseudo}** a été refusé.`, ephemeral: true });
  }
});

// === Login ===
client.login(TOKEN);
