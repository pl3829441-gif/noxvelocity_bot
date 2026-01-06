require('dotenv').config();
require('./server.js');

const { 
  Client, 
  GatewayIntentBits, 
  ActionRowBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  SlashCommandBuilder, 
  Routes 
} = require('discord.js');
const { REST } = require('@discordjs/rest');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// === Configuration ===
const ADMIN_ROLE_ID = 'ID_ROLE_ADMIN'; // Remplace par ton rôle admin
const WHITELIST_CHANNEL_ID = 'ID_CANAL_WHITELIST'; // Canal pour recevoir candidatures

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

// Enregistrement commandes
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ Commandes slash enregistrées');
  } catch (err) { console.error(err); }
})();

// === Event ready ===
client.once('ready', () => {
  console.log(`🏁 NOXVELOCITY BOT CONNECTÉ : ${client.user.tag}`);
});

// === Event interaction ===
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isModalSubmit()) return;

  // /help
  if (interaction.isChatInputCommand() && interaction.commandName === 'help') {
    await interaction.reply({
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

    const nameInput = new TextInputBuilder()
      .setCustomId('fullName')
      .setLabel("Prénom et Nom")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const pseudoInput = new TextInputBuilder()
      .setCustomId('pseudo')
      .setLabel("Pseudo")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const reasonInput = new TextInputBuilder()
      .setCustomId('reason')
      .setLabel("Pourquoi rejoindre le projet ?")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const row1 = new ActionRowBuilder().addComponents(nameInput);
    const row2 = new ActionRowBuilder().addComponents(pseudoInput);
    const row3 = new ActionRowBuilder().addComponents(reasonInput);

    modal.addComponents(row1, row2, row3);
    await interaction.showModal(modal);
  }

  // Modal submission
  if (interaction.isModalSubmit() && interaction.customId === 'whitelistModal') {
    const fullName = interaction.fields.getTextInputValue('fullName');
    const pseudo = interaction.fields.getTextInputValue('pseudo');
    const reason = interaction.fields.getTextInputValue('reason');

    const channel = client.channels.cache.ge
