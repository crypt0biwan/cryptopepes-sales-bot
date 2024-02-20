const { formatDiscordMessage, formatTwitterMessage } = require('../utils/format');

const mockTwitterClient = {
	v1: {
		uploadMedia: async function (cardPath) {
			console.log("mocked uploadMedia(): " + cardPath)
			return "unit-test";
		}
	}
}

const mockOpenSeaClient = (address) => {
	return new Promise((resolve, reject) => {
		if (address == "0xdf8904aeee028ffc017ebd1e0c4b0117116fc242")
			resolve({
				data: {
					username: "mockUsername",
					account: {
						user: {
							username: "mockUsername"
						}
					}
				}
			});
		else if (address == "0x73da1af06106a7f3ac717ef0fd637177175d98b7")
			resolve({
				data: {
					username: "mockUsername2",
					account: {
						user: {
							username: "mockUsername2"
						}
					}
				}
			});
		else
			resolve({
				data: {
					username: null,
				}
			});
	});
}

const assert = require("assert");

const singleSale = {
	data: [ 4057 ],
	totalPrice: 0.35,
	buyer: '0xdf8904aeee028ffc017ebd1e0c4b0117116fc242',
	seller: '0x73da1af06106a7f3ac717ef0fd637177175d98b7',
	ethPrice: 2979.3483605860984,
	token: 'ETH',
	platforms: [ 'Blur' ]
}

describe("Formatter", function () {
	this.timeout(10_000);

	describe("formatDiscordMessage()", function () {
		it("should format single sales correctly", async function () {
			const discordMsg = await formatDiscordMessage(mockOpenSeaClient, singleSale);

			assert.equal(discordMsg.username, 'CryptoPepes Sales')
			assert.equal(discordMsg.embeds[0].author.name, 'CryptoPepes')
			assert.equal(discordMsg.embeds[0].title, 'CryptoPepe 4057 has been sold')
			assert.equal(discordMsg.embeds[0].description, 'Platform: **Blur**\nBuyer: **mockUsername**\nSeller: **mockUsername2**\n---------------------------------')
			assert.equal(discordMsg.embeds[0].thumbnail.url, 'https://cryptopepes.wtf/imgs/4057.svg')
			assert.equal(discordMsg.embeds[0].color, '0x4bea1d')
			assert.deepEqual(discordMsg.embeds[0].fields[0], {
				"name": "Quantity",
				"value": "1",
				"inline": true
			})
			assert.deepEqual(discordMsg.embeds[0].fields[1], {
				"name": "ETH",
				"value": "0.35",
				"inline": true
			})
		});
	});
});
