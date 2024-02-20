const { handleTransfer, getEventsFromBlock } = require("../utils/watcher.js");
const { getUsername } = require("../utils/opensea");

const assert = require("assert");

const mockOpenSeaClient = (address) => {
	return new Promise((resolve, reject) => {
		if (address == "0x454685dec7796c2c747294f7aa7a30b2c5ab05f7")
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
		else
			resolve({
				data: {
					username: null,
				}
			});
	});
}

describe("Watcher", function () {
	this.timeout(10_000);

	describe("handleTransfer()", function () {
		it("should correctly find a transfer", async function () {
			const events = await getEventsFromBlock(19254567);
			assert.equal(events.length, 1);

			const transfer = await handleTransfer(events[0])

			assert.deepEqual(transfer.data, [3356])
			assert.equal(transfer.totalPrice, 0.9900000000000001);
		});
	});

	describe("bundleBlurSales()", function () {
		it("should return the correct data for a Blur WETH bundle sale", async function () {
			const details = await handleTransfer({
				transactionHash: '0x67f4423d69dc62c37640b38410a88d41eddeb97b84a783945a53753a0b47895b'
			})

			assert.deepEqual(details.data, [249, 2442, 3305, 3851, 4804])
			assert.equal(details.totalPrice, 2.06)
			assert.equal(details.token, "WETH")
		})

		it("should return the correct numbers for an ETH sale", async function () {
			const details = await handleTransfer({
				transactionHash: '0xd37d5238ea5fa2c94e287b0474f8772fadbad499afaed6a95aea43d7af499f26'
			})

			assert.deepEqual(details.data, [4057])
			assert.equal(details.token, "ETH");
			assert.equal(details.totalPrice, "0.35");
		})
	})

	describe("handleOpenSeaSales()", function () {
		it("should return the correct numbers for an ETH sale", async function () {
			const details = await handleTransfer({
				transactionHash: '0xfeacb33c462d9c9d5c6a1bc8cc1b38d3f98234bcea8eed812bee96df44769bb3'
			})

			assert.deepEqual(details.data, [2586])
			assert.equal(details.token, "ETH");
			assert.equal(details.totalPrice, "0.399");
		})

		it("should return the correct numbers for a WETH sale", async function () {
			const details = await handleTransfer({
				transactionHash: '0x0c8875da083a1bdefee9a72657508e47e1d060b70718aaccc079fc711f905d50'
			})

			assert.deepEqual(details.data, [3957])
			assert.equal(details.token, "WETH");
			assert.equal(details.totalPrice, "0.255");
		})
	})

	describe("handleNFTXSales()", function () {
		// TODO, there was no NFTX pool yet
	})

	describe("handleLooksRareSales()", function () {
		// TODO, there were no sales yet
	})

	describe("getOpenseaUsername()", function () {
		it("should correctly find the username corresponding to ETH address 0x454685dec7796c2c747294f7aa7a30b2c5ab05f7", async function () {
			const username = await getUsername(mockOpenSeaClient, "0x454685dec7796c2c747294f7aa7a30b2c5ab05f7");

			assert.equal(username, "mockUsername");
		});

		it("should correctly return a formatted ETH address when there's no username available", async function () {
			const username = await getUsername(mockOpenSeaClient, "0xbebf173c83ad4c877c04592de0c38567abf66526");

			assert.equal(username, "0xbeb...526");
		});
	});
});
