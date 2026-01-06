require('dotenv').config();
const fs = require('fs');
const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  ChannelType
} = require('discord.js');

/* =========================
   CONFIGURATION DES RÔLES
   👉 C’EST ICI QUE TU CHANGES LES NOMS
========================= */
const ROLES = {
  ADMIN: '👑 Admin',
  MOD: '🛠️ Modérateur',
  ORGANISATEUR: '🏁 Organisateur',
  PILOTE: '🏎️ Street Racer'
};

/* =========================
   CLIENT
========================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

/* =========================
   DATA PILOTES
========================= */
const pilotsPath = './data/pilots.json';
if (!fs.existsSync('./data')) fs.mkdirSync('./data');
if (!fs.existsSync(pilotsPath)) fs.writeFileSync(pilotsPath, '{}');

const getPilots = () => JSON.parse(fs.readFileSync(pilotsPath));
const savePilots = (data) =>
  fs.writeFileSync(pilotsPath, JSON.stringify(data, null, 2));

/* =========================
   READY
========================= */
client.once('ready', async () => {
  console.log(`🏁 NOXVELOCITY BOT CONNECTÉ : ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName('setup')
      .setDescription('Créer le Discord NOXVELOCITY'),
    new SlashCommandBuilder()
      .setName('help')
      .setDescription('Affiche toutes les commandes disponibles pour NOXVELOCITY'),

    new SlashCommandBuilder()
      .setName('post-whitelist')
      .setDescription('Poster le message de whitelist'),

    new SlashCommandBuilder()
      .setName('accept')
      .setDescription('Accepter un pilote')
      .addUserOption(o =>
        o.setName('joueur').setDescription('Pilote').setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('classement')
      .setDescription('Afficher le classement NOXVELOCITY')
  ];

  await client.application.commands.set(commands);
});

/* =========================
   INTERACTIONS
========================= */
client.on('interactionCreate', async interaction => {

  /* ===== SETUP ===== */
  if (interaction.isChatInputCommand() && interaction.commandName === 'setup') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ Admin requis', ephemeral: true });
    }

    await interaction.reply('🏗️ Création du serveur NOXVELOCITY...');

    // RÔLES
    const admin = await interaction.guild.roles.create({
      name: ROLES.ADMIN,
      permissions: [PermissionsBitField.All]
    });

    const mod = await interaction.guild.roles.create({ name: ROLES.MOD });
    const orga = await interaction.guild.roles.create({ name: ROLES.ORGANISATEUR });
    const pilote = await interaction.guild.roles.create({ name: ROLES.PILOTE });

    // CATÉGORIES
    const info = await interaction.guild.channels.create({
      name: '📢 Informations',
      type: ChannelType.GuildCategory
    });

    const rp = await interaction.guild.channels.create({
      name: '🏁 Street Racing RP',
      type: ChannelType.GuildCategory
    });

    const commu = await interaction.guild.channels.create({
      name: '💬 Communauté',
      type: ChannelType.GuildCategory
    });

    const staff = await interaction.guild.channels.create({
      name: '🛠️ Staff',
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone.id, deny: ['ViewChannel'] },
        { id: mod.id, allow: ['ViewChannel'] },
        { id: admin.id, allow: ['ViewChannel'] }
      ]
    });

    // SALONS
    await interaction.guild.channels.create({ name: 'annonces', parent: info.id });
    await interaction.guild.channels.create({ name: 'règlement', parent: info.id });
    await interaction.guild.channels.create({ name: 'infos-serveur', parent: info.id });
    await interaction.guild.channels.create({ name: 'whitelist', parent: info.id });

    await interaction.guild.channels.create({ name: 'présentations', parent: rp.id });
    await interaction.guild.channels.create({ name: 'recherche-course', parent: rp.id });
    await interaction.guild.channels.create({ name: 'résultats-courses', parent: rp.id });
    await interaction.guild.channels.create({ name: 'custom-vehicules', parent: rp.id });

    await interaction.guild.channels.create({ name: 'général', parent: commu.id });
    await interaction.guild.channels.create({ name: 'screenshots', parent: commu.id });

    await interaction.guild.channels.create({ name: 'staff-chat', parent: staff.id });
    await interaction.guild.channels.create({ name: 'logs', parent: staff.id });

    interaction.followUp('✅ Discord NOXVELOCITY créé.');
  }

  /* ===== POST WHITELIST ===== */
  if (interaction.isChatInputCommand() && interaction.commandName === 'post-whitelist') {
    const embed = new EmbedBuilder()
      .setTitle('🏁 NOXVELOCITY — Recrutement Pilotes')
      .setDescription(
        'Réseau underground de street racing.\n\n' +
        '🚗 Courses nocturnes\n🏆 Classement officiel\n📜 RP sérieux\n\n' +
        'Clique ci-dessous pour postuler.'
      )
      .setColor(0xE10600);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('whitelist_btn')
        .setLabel('📝 Postuler')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    interaction.reply({ content: '✅ Message whitelist posté.', ephemeral: true });
  }

  /* ===== BOUTON ===== */
  if (interaction.isButton() && interaction.customId === 'whitelist_btn') {
    const modal = new ModalBuilder()
      .setCustomId('whitelist_modal')
      .setTitle('NOXVELOCITY — Candidature');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('prenom')
          .setLabel('Prénom Nom')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('pseudo')
          .setLabel('Pseudo RP')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('motivation')
          .setLabel('Pourquoi rejoindre NOXVELOCITY ?')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      )
    );

    await interaction.showModal(modal);
  }

  /* ===== MODALE ===== */
  if (interaction.isModalSubmit() && interaction.customId === 'whitelist_modal') {
    const prenom = interaction.fields.getTextInputValue('prenom');
    const pseudo = interaction.fields.getTextInputValue('pseudo');
    const motivation = interaction.fields.getTextInputValue('motivation');

    const salon = interaction.guild.channels.cache.find(c => c.name === 'whitelist');

    const embed = new EmbedBuilder()
      .setTitle('📋 Nouvelle candidature')
      .setColor(0x111111)
      .addFields(
        { name: 'Discord', value: `<@${interaction.user.id}>` },
        { name: 'Prénom Nom', value: prenom },
        { name: 'Pseudo', value: pseudo },
        { name: 'Motivation', value: motivation }
      );

    salon.send({ embeds: [embed] });
    interaction.reply({ content: '✅ Candidature envoyée.', ephemeral: true });
  }

  /* ===== ACCEPT ===== */
  if (interaction.isChatInputCommand() && interaction.commandName === 'accept') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) return;

    const user = interaction.options.getUser('joueur');
    const role = interaction.guild.roles.cache.find(r => r.name === ROLES.PILOTE);
    const member = await interaction.guild.members.fetch(user.id);

    await member.roles.add(role);

    const pilots = getPilots();
    pilots[user.id] = { points: 0, races: 0, wins: 0 };
    savePilots(pilots);

    interaction.reply(`🏁 ${user} est maintenant pilote NOXVELOCITY.`);
  }

  /* ===== CLASSEMENT ===== */
  if (interaction.isChatInputCommand() && interaction.commandName === 'classement') {
    const pilots = getPilots();
    const sorted = Object.entries(pilots).sort((a, b) => b[1].points - a[1].points);

    const desc = sorted.length
      ? sorted.map(
          ([id, d], i) => `**#${i + 1}** <@${id}> — ${d.points} pts`
        ).join('\n')
      : 'Aucun pilote classé.';

    interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🏆 Classement NOXVELOCITY')
          .setDescription(desc)
          .setColor(0xE10600)
      ]
    });
  }
});

/* ========================= */
client.login(process.env.TOKEN);
