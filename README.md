# reshapd ![images](./1349570d-d4b3-4d37-826d-f856aea952f9.png)

A single-file, production-ready AI Agent Chatbot for Discord powered by Mistral AI and hosted effortlessly on Railway. **reshapd** responds to direct mentions and DMs using `mistral-large-latest`, handles image generation commands via `/imagine`, and supports custom personalities.

---

## 🚀 Quick Start Guide

### 1. Discord Developer Portal Setup
Before deploying your code, you need to create your application backend inside Discord's infrastructure:

1. Open the [Discord Developer Portal](https://discord.com) and click **New Application**.
2. Name your application (e.g., `reshapd`) and save.
3. **Get Client ID**: Copy the **Application ID** on the **General Information** tab. (This will be your `CLIENT_ID`).
4. **Get Bot Token**: Go to the **Bot** tab on the left sidebar. Click **Reset Token** and copy the long token string. (This will be your `DISCORD_TOKEN`).
5. **Enable Gateways**: On the same **Bot** page, scroll down to **Privileged Gateway Intents** and enable:
   * 🟢 **Presence Intent**
   * 🟢 **Server Members Intent**
   * 🟢 **Message Content Intent** *(Critical: Without this, your bot cannot read chat text to reply!)*

#### Invite the Bot to Your Server
1. Go to the **OAuth2** tab, then select **URL Generator**.
2. Under **Scopes**, check `bot` and `applications.commands`.
3. Under **Bot Permissions**, check:
   * `Send Messages`
   * `Read Message History`
   * `Embed Links`
4. Copy the generated URL at the bottom of the page, paste it into your browser, and authorize it for your chosen Discord server.

---

### 2. Customizing the Personality
You can shape the bot's behavior, formatting preferences, and identity without changing any actual JavaScript engine code. Open `personality.json` and adjust the values:

```json
{
  "botName": "reshapd",
  "tagline": "A sharp, witty, and deeply intuitive AI digital companion.",
  "corePersonality": "You are highly intelligent, playful, slightly sarcastic, yet incredibly helpful.",
  "chatStyleRules": [
    "Keep responses concise and formatted cleanly using Discord markdown.",
    "Never sound overly formal or robotic."
  ],
  "styleInspirationExamples": [
    {
      "user": "hi",
      "response": "hey! how are you? what are we building today?"
    }
  ]
}
```
*Note: The `styleInspirationExamples` serve as few-shot injection templates. The AI studies these examples for tone inspiration rather than copy-pasting them verbatim.*

---

### 3. Deploying to Railway
Railway monitors your repository and handles all background resource management seamlessly.

1. Create a GitHub repository containing these three project files:
   * `index.js`
   * `package.json`
   * `personality.json`
2. Log into [Railway](https://railway.com) and select **New Project** → **Deploy from GitHub repo**.
3. Choose your repository from the menu list.
4. **Important**: Before launching, click on the **Variables** tab in your Railway project dashboard and add these three environment configurations:


| Environment Variable | Description | Source |
| :--- | :--- | :--- |
| `DISCORD_TOKEN` | Your application secret token | Discord Portal → Bot tab |
| `CLIENT_ID` | Your client application identity | Discord Portal → General Info tab |
| `MISTRAL_API_KEY` | Your live platform key | [Mistral Console API Keys](https://mistral.ai) |

5. Click **Deploy**. Railway automatically provision-builds the Node environment, installs dependencies, and turns your bot online.

---

## 🛠️ How to Use It

* **Chatting**: Type a direct message to your bot, or mention it in an authorized server channel (`@reshapd what is the best way to write clean code?`).
* **Generating Artwork**: Type `/imagine prompt: a retro neon server room running on tracks` into any text channel to call Mistral's Agent image creation suite.

---

## 🔄 Updates & Maintenance
Any time you want to alter your bot's behavior or add new phrasing rules, simply update your local `personality.json` file. Commit your changes and push them to your repository (`git push origin main`). Railway detects the changes and automatically restarts the bot instance with its brand new persona within seconds.
