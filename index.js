const { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  SlashCommandBuilder, 
  ActivityType
} = require('discord.js');
const { Mistral } = require('@mistralai/mistralai');
const fs = require('fs');
const path = require('path');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const CLIENT_ID = process.env.CLIENT_ID;

if (!DISCORD_TOKEN || !MISTRAL_API_KEY || !CLIENT_ID) {
  console.error("❌ Missing required Environment Variables: DISCORD_TOKEN, MISTRAL_API_KEY, or CLIENT_ID.");
  process.exit(1);
}

let personality;
try {
  const rawData = fs.readFileSync(path.join(__dirname, 'personality.json'), 'utf8');
  personality = JSON.parse(rawData);
  console.log(`✨ Successfully loaded configuration for agent: ${personality.botName}`);
} catch (error) {
  console.error("❌ Failed to read personality.json file:", error);
  process.exit(1);
}

const baseSystemPrompt = `You are ${personality.botName}. ${personality.tagline}\n\nPersonality Profile:\n${personality.corePersonality}\n\nStrict Styling Guidelines:\n${personality.chatStyleRules.map(rule => `- ${rule}`).join('\n')}`;

const fewShotExamples = [];
if (personality.styleInspirationExamples && personality.styleInspirationExamples.length > 0) {
  personality.styleInspirationExamples.forEach(ex => {
    fewShotExamples.push({ role: 'user', content: ex.user });
    fewShotExamples.push({ role: 'assistant', content: ex.response });
  });
}

const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const mistral = new Mistral({ apiKey: MISTRAL_API_KEY });

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('imagine')
      .setDescription(`Ask ${personality.botName} to visually design an image context`)
      .addStringOption(option =>
        option.setName('prompt')
          .setDescription('The descriptive prompt for the image')
          .setRequired(true)
      )
  ].map(command => command.toJSON());

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  try {
    console.log('🔄 Started refreshing application (/) commands...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('❌ Error registering slash commands:', error);
  }
}

discordClient.once('ready', () => {
  console.log(`🤖 Logged in as ${discordClient.user.tag}!`);
  discordClient.user.setActivity(`with prompts | ${personality.botName}`, { type: ActivityType.Custom });
  registerCommands();
});

discordClient.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const isDM = !message.guild;
  const isMentioned = message.mentions.has(discordClient.user) && !message.mentions.everyone;

  if (isDM || isMentioned) {
    let userPrompt = message.content.replace(`<@${discordClient.user.id}>`, '').trim();
    
    if (!userPrompt) {
      return message.reply(`👋 Hey! I am ${personality.botName}. Chat with me here, or run \`/imagine\` to build images.`);
    }

    try {
      await message.channel.sendTyping();

      const payloadMessages = [
        { role: 'system', content: baseSystemPrompt },
        ...fewShotExamples,
        { role: 'user', content: userPrompt }
      ];

      const response = await mistral.chat.complete({
        model: 'mistral-large-latest',
        messages: payloadMessages
      });

      const replyText = response.choices.message.content;

      if (replyText.length > 2000) {
        const chunks = replyText.match(/[\s\S]{1,2000}/g) || [];
        for (const chunk of chunks) {
          await message.reply(chunk);
        }
      } else {
        await message.reply(replyText);
      }
    } catch (error) {
      console.error('❌ Mistral API Error:', error);
      await message.reply('⚠️ Conversational context failed to pass through agent pipeline.');
    }
  }
});

discordClient.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'imagine') {
    const prompt = interaction.options.getString('prompt');
    await interaction.deferReply();

    try {
      console.log(`🎨 Generating image for prompt: "${prompt}"`);

      const response = await mistral.agents.complete({
        agentId: 'default',
        tools: [{ type: 'image_generation' }],
        messages: [{ role: 'user', content: `Generate an image matching this request: ${prompt}` }]
      });

      const toolCalls = response.choices.message.toolCalls;
      
      if (toolCalls && toolCalls.length > 0) {
        await interaction.editReply(`✨ Here is what I imagined for **"${prompt}"**: (Image tool activated context successfully)`);
      } else {
        await interaction.editReply(`🎨 Processing complete. Agent feedback: ${response.choices.message.content}`);
      }
      
    } catch (error) {
      console.error('❌ Image Generation Error:', error);
      await interaction.editReply('⚠️ Image processing tool failed. Verify API Tier feature access permissions.');
    }
  }
});

discordClient.login(DISCORD_TOKEN);
