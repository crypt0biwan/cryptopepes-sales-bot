const COLORS = require('./colors')
const { getUsername } = require('./opensea')
const genInfo = require('../data/gen-info.json')

// style = currency to include dollar sign
const formatValue = (value, decimals = 2, style = 'decimal') =>
	new Intl.NumberFormat('en-US', {
		style,
		currency: 'USD',
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	}).format(value)

const formatDiscordMessage = async (openSeaClient, { data, totalPrice, buyer, seller, ethPrice, token, platforms }) => {
	const buyerUsername = await getUsername(openSeaClient, buyer)
	const sellerUsername = (seller === "Multiple") ? "Multiple" : await getUsername(openSeaClient, seller)

	const contract = '0xe59b419fac4b9b769c4439e7c4fde22418f11c89'
	
	let gen = '?'
	let url = ''

	switch(platforms[0]) {
		case 'Blur': {
			url = `https://blur.io/asset/${contract}/${data[0]}`
			break
		}
		case 'LooksRare': {
			url = `https://looksrare.org/collections/${contract}/${data[0]}`
			break
		}
		default: {
			url = `https://opensea.io/assets/ethereum/${contract}/${data[0]}`
			break
		}
	}
		
	let fields = [
		{
			name: token,
			value: formatValue(parseFloat(totalPrice), 2),
			inline: true,
		}
	];

	let title = "";
	if (data.length > 1) {
		title = `CryptoPepes ${data.join(", ")} have been sold`;
	} else {
		title = `CryptoPepe ${data[0]} has been sold`;
		gen = genInfo.find(g => g.id === data[0]).gen
	}

	if (['ETH', 'WETH'].includes(token)) {
		fields.push({
			name: 'USD',
			value: formatValue(parseFloat(totalPrice * ethPrice), 0),
			inline: true,
		})
	}

	let color = token === 'WETH' ? COLORS.LIGHTBLUE : COLORS.GREEN

	let draft = {
		username: 'CryptoPepes Sales',
		embeds: [
			{
				author: {
					name: 'CryptoPepes',
				},
				title: title,
				description: `${data.length === 1 ? `Gen: **${gen}**\n` : ''}${platforms.length > 1 ? "Platforms" : "Platform"}: **${platforms.join(", ")}**\nBuyer: **${buyerUsername}**\nSeller: **${sellerUsername}**\n---------------------------------`,
				url,
				thumbnail: {
					url: `https://raw.githubusercontent.com/crypt0biwan/cryptopepes-sales-bot/main/images/300x300/${data[0]}.png`
				},
				color,
				fields,
				timestamp: new Date()
			}
		]
	}

	return draft
}

module.exports = exports = {
	formatDiscordMessage,
}
