const { WebhookClient } = require('discord.js');
const { watchForTransfers } = require('./utils/watcher');
const { formatDiscordMessage } = require('./utils/format');
const { openSeaClient } = require('./utils/opensea')

require('dotenv').config();
const {
	DISCORD_ID, DISCORD_TOKEN,
} = process.env;

const webhookClient = new WebhookClient({ id: DISCORD_ID, token: DISCORD_TOKEN });

const transferHandler = async ({ data, totalPrice, buyer, seller, ethPrice, token, platforms }) => {
	// post to discord
	const discordMsg = await formatDiscordMessage(openSeaClient, { data, totalPrice, buyer, seller, ethPrice, token, platforms });
	webhookClient.send(discordMsg).catch(console.error);
};

console.log("Starting bot");
watchForTransfers(transferHandler);
