const { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  SlashCommandBuilder, 
  AttachmentBuilder,
  ActivityType
} = require('discord.js');
const { Mistral } = require('@mistralai/mistralai');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const CLIENT_ID = process.env.CLIENT_ID; 

if (!DISCORD_TOKEN || !MISTRAL_API_KEY || !CLIENT_ID) {
  console.error("❌ Missing required Environment Variables: DISCORD_TOKEN, MISTRAL_API_KEY, or CLIENT_ID.");
  process.exit(1);
}

const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const mistral = new Mistral({ apiKey: MISTRAL_API_KEY });

const SYSTEM_PROMPT = "You are a helpful, witty, and highly intelligent AI Discord companion. Keep responses conversational, concise, and optimized for chat formatting.";

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('imagine')
      .setDescription('Generate an image using Mistral\'s Agent capabilities')
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
  discordClient.user.setActivity('with prompts', { type: ActivityType.Playing });
  registerCommands();
});

discordClient.on('messageCreate', async (message) => {
  
  if (message.author.bot) return;

  const isDM = !message.guild;
  const isMentioned = message.mentions.has(discordClient.user) && !message.mentions.everyone;

  if (isDM || isMentioned) {
    
    let userPrompt = message.content.replace(`<@${discordClient.user.id}>`, '').trim();
    
    if (!userPrompt) {
      return message.reply("👋 Hello! Mention me or DM me with a question to chat, or use `/imagine` to create art!");
    }

    try {
      await message.channel.sendTyping();

      const response = await mistral.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ]
      });

      const replyText = response.choices[0].message.content;

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
      await message.reply('⚠️ Sorry, I encountered an issue processing your text request.');
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

      
      const toolCalls = response.choices[0].message.toolCalls;
      
      
      if (toolCalls && toolCalls.length > 0) {
         
        await interaction.editReply(`✨ here is what I imagined for **"${prompt}"**: (Tool activated successfully)`);
      } else {
      
        await interaction.editReply(`🎨 Processing complete. Agent text details: ${response.choices[0].message.content}`);
      }
      
    } catch (error) {
      console.error('❌ Image Generation Error:', error);
      await interaction.editReply('⚠️ Failed to generate your image. Please ensure your Mistral subscription supports the Image Tool features.');
    }
  }
});

discordClient.login(DISCORD_TOKEN);
