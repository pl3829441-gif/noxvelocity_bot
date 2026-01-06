require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  REST,
  Routes
} = require('discord.js');
const fs = require('fs');
const express = require('express');

/* ===== CONFIG ===== */
const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const CLIENT_ID = process.env.CLIENT_ID;
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;
const ANNOUNCE_CHANNEL_ID = process.env.ANNOUNCE_CHANNEL_ID;
const EMBED_COLOR = 0xff6a00;
const DATA_FILE = './pilots.json';

/* ===== DATA ===== */
function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      pending: [],
      accepted: [],
      denied: [],
      races: []
    }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE));
}
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* ===== CLIENT ===== */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* ===== COMMANDES ===== */
const commands = [
  new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Demander la whitelist pour devenir pilote')
    .addStringOption(o => o.setName('pseudo').setDescription('Ton pseudo RP').setRequired(true)),

  new SlashCommandBuilder()
    .setName('accept')
    .setDescription('Accepter un pilote')
    .addUserOption(o => o.setName('user').setDescription('Utilisateur à accepter').setRequired(true)),

  new SlashCommandBuilder()
    .setName('deny')
    .setDescription('Refuser un pilote')
    .addUserOption(o => o.setName('user').setDescription('Utilisateur à refuser').setRequired(true)),

  new SlashCommandBuilder()
    .setName('course')
    .setDescription('Créer une course')
    .addStringOption(o => o.setName('lieu').setDescription('Lieu de la course').setRequired(true))
    .addStringOption(o => o.setName('heure').setDescription('Heure du rendez-vous').setRequired(true))
    .addStringOption(o => o.setName('type').setDescription('Type de course').setRequired(true))
    .addIntegerOption(o => o.setName('max').setDescription('Nombre maximum de pilotes').setRequired(true)),

  new SlashCommandBuilder()
    .setName('resultat')
    .setDescription('Enregistrer les résultats d’une course')
    .addStringOption(o => o.setName('race_id').setDescription('ID de la course').setRequired(true))
    .addStringOption(o => o.setName('classement').setDescription('Pseudo1,Pseudo2,...').setRequired(true)),

  new SlashCommandBuilder()
    .setName('profil')
    .setDescription('Voir ton profil pilote'),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Voir le classement général')
];

const rest = new REST({ version: '10' }).setToken(TOKEN);
rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
  body: commands.map(c => c.toJSON())
});

/* ===== READY ===== */
client.once('ready', () => {
  console.log(`🤖 Bot connecté : ${client.user.tag}`);
});

/* ===== INTERACTIONS ===== */
client.on('interactionCreate', async interaction => {
  const data = loadData();

  /* ===== WHITELIST ===== */
  if (interaction.commandName === 'whitelist') {
    const pseudo = interaction.options.getString('pseudo');
    data.pending.push({ user: interaction.user.id, pseudo });
    saveData(data);
    return interaction.reply({ ephemeral: true, content: '📨 Demande envoyée !' });
  }

  /* ===== ACCEPT ===== */
  if (interaction.commandName === 'accept') {
    if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) return;
    const user = interaction.options.getUser('user');
    const req = data.pending.find(p => p.user === user.id);
    if (!req) return interaction.reply({ ephemeral: true, content: 'Utilisateur non trouvé' });

    data.pending = data.pending.filter(p => p.user !== user.id);
    data.accepted.push({
      user: user.id,
      pseudo: req.pseudo,
      stats: { races: 0, wins: 0, podiums: 0, dnf: 0, history: [] }
    });
    saveData(data);
    return interaction.reply({ content: `✅ ${req.pseudo} accepté` });
  }

  /* ===== DENY ===== */
  if (interaction.commandName === 'deny') {
    if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) return;
    const user = interaction.options.getUser('user');
    const req = data.pending.find(p => p.user === user.id);
    if (!req) return interaction.reply({ ephemeral: true, content: 'Utilisateur non trouvé' });

    data.pending = data.pending.filter(p => p.user !== user.id);
    data.denied.push(req);
    saveData(data);
    return interaction.reply({ content: `❌ ${req.pseudo} refusé` });
  }

  /* ===== COURSE ===== */
  if (interaction.commandName === 'course') {
    if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) return;

    const race = {
      id: `race_${Date.now()}`,
      lieu: interaction.options.getString('lieu'),
      heure: interaction.options.getString('heure'),
      type: interaction.options.getString('type'),
      max: interaction.options.getInteger('max'),
      participants: []
    };
    data.races.push(race);
    saveData(data);

    const embed = new EmbedBuilder()
      .setTitle('🏁 COURSE NOXVELOCITY')
      .setColor(EMBED_COLOR)
      .addFields(
        { name: '📍 Lieu', value: race.lieu },
        { name: '⏰ Heure', value: race.heure },
        { name: '🏎️ Type', value: race.type },
        { name: '👥 Pilotes', value: `0 / ${race.max}` }
      )
      .setFooter({ text: `ID: ${race.id}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`race_join_${race.id}`).setLabel('S’inscrire').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`race_leave_${race.id}`).setLabel('Se désinscrire').setStyle(ButtonStyle.Danger)
    );

    const channel = await client.channels.fetch(ANNOUNCE_CHANNEL_ID);
    await channel.send({ embeds: [embed], components: [row] });

    return interaction.reply({ ephemeral: true, content: '📣 Course créée !' });
  }

  /* ===== BOUTONS ===== */
  if (interaction.isButton()) {
    const [, action, id] = interaction.customId.split('_');
    const race = data.races.find(r => r.id === id);
    const pilot = data.accepted.find(p => p.user === interaction.user.id);
    if (!race || !pilot) return interaction.reply({ ephemeral: true, content: '❌ Action impossible' });

    if (action === 'join') {
      if (!race.participants.includes(pilot.pseudo) && race.participants.length < race.max) {
        race.participants.push(pilot.pseudo);
      }
    }
    if (action === 'leave') {
      race.participants = race.participants.filter(p => p !== pilot.pseudo);
    }
    saveData(data);

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .spliceFields(3, 1, {
        name: '👥 Pilotes',
        value: `${race.participants.length} / ${race.max}\n${race.participants.join('\n') || 'Aucun'}`
      });

    await interaction.message.edit({ embeds: [embed] });
    return interaction.reply({ ephemeral: true, content: '✅ Mise à jour effectuée' });
  }

  /* ===== RESULTAT ===== */
  if (interaction.commandName === 'resultat') {
    if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) return;

    const raceId = interaction.options.getString('race_id');
    const classement = interaction.options.getString('classement').split(',').map(s => s.trim());

    classement.forEach((pseudo, i) => {
      const pilot = data.accepted.find(p => p.pseudo === pseudo);
      if (!pilot) return;

      pilot.stats.races++;
      pilot.stats.history.push(raceId);
      if (i === 0) pilot.stats.wins++;
      if (i < 3) pilot.stats.podiums++;
    });

    saveData(data);
    return interaction.reply({ content: '🏆 Résultats enregistrés !' });
  }

  /* ===== PROFIL ===== */
  if (interaction.commandName === 'profil') {
    const pilot = data.accepted.find(p => p.user === interaction.user.id);
    if (!pilot) return interaction.reply({ ephemeral: true, content: '❌ Pas whitelisté' });

    const s = pilot.stats;
    const embed = new EmbedBuilder()
      .setTitle(`🏎️ Profil ${pilot.pseudo}`)
      .setColor(EMBED_COLOR)
      .addFields(
        { name: 'Courses', value: `${s.races}`, inline: true },
        { name: 'Victoires', value: `${s.wins}`, inline: true },
        { name: 'Podiums', value: `${s.podiums}`, inline: true },
        { name: 'DNF', value: `${s.dnf}`, inline: true }
      );

    return interaction.reply({ embeds: [embed] });
  }

  /* ===== LEADERBOARD ===== */
  if (interaction.commandName === 'leaderboard') {
    const sorted = [...data.accepted].sort((a, b) => b.stats.wins - a.stats.wins).slice(0, 10);
    const embed = new EmbedBuilder()
      .setTitle('🏆 Leaderboard NOXVELOCITY')
      .setColor(EMBED_COLOR)
      .setDescription(sorted.map((p, i) => `${i + 1}. **${p.pseudo}** - ${p.stats.wins} victoires`).join('\n'));

    return interaction.reply({ embeds: [embed] });
  }
});

/* ===== LOGIN ===== */
client.login(TOKEN);

/* ===== WEB SERVER POUR RENDER ===== */
const app = express();
const PORT = process.env.PORT || 10000;
app.get('/', (_, res) => res.send('NOXVELOCITY BOT ONLINE'));
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));
