const COLORS = require('./colors')
const { getUsername } = require('./opensea')

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
	const url =
		platforms[0] === 'LooksRare'
			? `https://looksrare.org/collections/${contract}/${data[0]}`
			: `https://opensea.io/assets/ethereum/${contract}/${data[0]}`;
	let fields = [
		{
			name: 'Quantity',
			value: data.length,
			inline: true,
		},
		{
			name: token,
			value: formatValue(parseFloat(totalPrice), 2),
			inline: true,
		}
	];

	let title = "";
	if (data.length > 1) {
		title = `CryptoPepes ${cards.join(", ")} have been sold`;
	} else {
		title = `CryptoPepe ${data[0]} has been sold`;
	}

	if (['ETH', 'WETH'].includes(token)) {
		fields.push({
			name: 'USD',
			value: formatValue(parseFloat(totalPrice * ethPrice), 0),
			inline: true,
		})
	}
	return {
		username: 'CryptoPepes Sales',
		embeds: [
			{
				author: {
					name: 'CryptoPepes',
				},
				title: title,
				description: `${platforms.length > 1 ? "Platforms" : "Platform"}: **${platforms.join(", ")}**\nBuyer: **${buyerUsername}**\nSeller: **${sellerUsername}**\n---------------------------------`,
				url,
				thumbnail: {
					url: `https://cryptopepes.wtf/imgs/${data[0]}.svg`
				},
				color: COLORS.GREEN,
				fields,
				timestamp: new Date()
			}
		]
	}
}

module.exports = exports = {
	formatDiscordMessage,
}
