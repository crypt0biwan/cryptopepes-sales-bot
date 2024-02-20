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

// async function uploadMedia(twitterClient, _card) {
// 	mediaId = await twitterClient.v1.uploadMedia(`images/${getImageURL(_card)}`);

// 	return mediaId;
// }

// const formatTwitterMessage = async (twitterClient, { data, totalPrice, buyer, seller, ethPrice, token, platforms }) => {
// 	let twitterMessage;
// 	let mediaIds = [];
// 	let totalPriceString = formatValue(totalPrice, 2)

// 	if (Object.keys(data).length == 1) {
// 		let totalPriceUsdString = "";
// 		if (['ETH', 'WETH'].includes(token)) {
// 			totalPriceUsdString = `(${formatValue(totalPrice * ethPrice, 0, 'currency')}) `;
// 		}

// 		let platformString = "";
// 		if (platforms.length > 1) {
// 			platformString = `on ${platforms[0]}!`;
// 		} else if (platforms.length > 0) {
// 			platformString = `on ${platforms.join(", ")}!`;
// 		}

// 		const cardNum = Object.keys(data)[0];
// 		const cardCount = Object.values(data)[0];
// 		let qtyString = "";
// 		if (cardCount > 1) {
// 			qtyString = `${cardCount}x `;
// 		}
// 		if (cardNum == "172") {
// 			twitterMessage = `${qtyString}Curio Card 17b (misprint) sold for ${totalPriceString} ${token} ${totalPriceUsdString}${platformString}\n\nhttps://opensea.io/assets/ethereum/0x04AfA589E2b933f9463C5639f412b183Ec062505/${cardNum}`;
// 		} else {
// 			twitterMessage = `${qtyString}Curio Card ${cardNum} sold for ${totalPriceString} ${token} ${totalPriceUsdString}${platformString}\n\nhttps://opensea.io/assets/ethereum/0x73DA73EF3a6982109c4d5BDb0dB9dd3E3783f313/${cardNum}`;
// 		}

// 		mediaIds = [await uploadMedia(twitterClient, cardNum)];
// 	} else {
// 		let qtyString = Object.entries(data).map(q => {
// 			if (q[0] == "172") {
// 				return `${q[1]}x Curio 17b (misprint)`;
// 			} else {
// 				return `${q[1]}x Curio ${q[0]}`;
// 			}
// 		}).join('\n');

// 		let totalPriceUsdString = "";
// 		if (['ETH', 'WETH'].includes(token)) {
// 			totalPriceUsdString = `(${formatValue(totalPrice * ethPrice, 0, 'currency')})`;
// 		}

// 		const cardNums = Object.keys(data).slice(0, 4);

// 		twitterMessage = `Multiple Curio Cards sold for a total of ${totalPriceString} ${token} ${totalPriceUsdString}!\n${qtyString}`;
// 		mediaIds = await Promise.all(cardNums.map(card => uploadMedia(twitterClient, card)));
// 	}

// 	return [twitterMessage, mediaIds];
// }

module.exports = exports = {
	formatDiscordMessage,
	// formatTwitterMessage,
}
