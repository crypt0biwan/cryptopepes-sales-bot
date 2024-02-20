const Ethers = require("ethers");
require('dotenv').config()
const { INFURA_PROJECT_ID, INFURA_SECRET } = process.env

// set up provider
const provider = new Ethers.providers.InfuraProvider("homestead", {
	projectId: INFURA_PROJECT_ID,
	projectSecret: INFURA_SECRET
});

// contract addresses should be lowercase
const OPENSEA_CONTRACT = "0x7f268357a8c2552623316e2562d90e642bb538e5";
const OLD_OPENSEA_CONTRACT = "0x7be8076f4ea4a4ad08075c2508e481d6c946d12b";
const wyvernAbi = require("../abis/WyvernExchangeWithBulkCancellations.json");
const wyvernContract = new Ethers.Contract(OPENSEA_CONTRACT, wyvernAbi, provider);
const erc20TokenAbi = require("../abis/ERC20Token.json");

const OPENSEA_SEAPORT_CONTRACT_1_2 = "0x00000000006c3852cbef3e08e8df289169ede581"
const OPENSEA_SEAPORT_CONTRACT_1_4 = "0x00000000000001ad428e4906ae43d8f9852d0dd6"
const OPENSEA_SEAPORT_CONTRACT_1_5 = "0x00000000000000adc04c56bf30ac9d3c0aaf14dc"
const seaportAbi = require("../abis/SeaPort.json");
const seaportContract = new Ethers.Contract(OPENSEA_SEAPORT_CONTRACT_1_5, seaportAbi, provider);

const WRAPPER_CONTRACT = "0xe59b419fac4b9b769c4439e7c4fde22418f11c89";
const abi = require("../abis/wrapperABI.json");
const contract = new Ethers.Contract(WRAPPER_CONTRACT, abi, provider);

const LOOKSRARE_CONTRACT = "0x59728544b08ab483533076417fbbb2fd0b17ce3a"
const looksAbi = require("../abis/LooksRare.json");
const looksContract = new Ethers.Contract(LOOKSRARE_CONTRACT, looksAbi, provider);

// const BLUR_CONTRACT = "0xb2ecfe4e4d61f8790bbb9de2d1259b9e2410cea5" // Blur.io: Marketplace 3
// const blurAbi = require("../abis/Blur.json");
// const blurContract = new Ethers.Contract(BLUR_CONTRACT, blurAbi, provider);

const BLUR_POOL_CONTRACT = "0x0000000000A39bb272e79075ade125fd351887Ac"
const blurPoolAbi = require("../abis/BlurPool.json");
const blurPoolContract = new Ethers.Contract(BLUR_POOL_CONTRACT, blurPoolAbi, provider);

const UNISWAP_USDC_ETH_LP_CONTRACT = "0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc";
const uniswapAbi = require("../abis/Uniswap_USDC_ETH_LP.json");
const uniswapContract = async () => await new Ethers.Contract(UNISWAP_USDC_ETH_LP_CONTRACT, uniswapAbi, provider);

const getEthUsdPrice = async () => await uniswapContract()
	.then(contract => contract.getReserves())
	.then(reserves => Number(reserves._reserve0) / Number(reserves._reserve1) * 1e12); // times 10^12 because usdc only has 6 decimals

const eventFilter = {
	address: WRAPPER_CONTRACT,
	topics: [
		Ethers.utils.id("Transfer(address,address,uint256)")
	]
};

// this is a helper for the unit test
async function getEventsFromBlock(blockNum) {
	return await contract.queryFilter(eventFilter, fromBlock=blockNum, toBlock=blockNum);
}

let lastTx;
async function handleTransfer(tx) {
	let txReceipt = await provider.getTransactionReceipt(tx.transactionHash);
	if (lastTx === tx.transactionHash) return {}; // Transaction already seen
	lastTx = tx.transactionHash
	let totalPrice = 0
	let token = 'ETH'
	let platforms = []
	let wyvernLogRaw = txReceipt.logs.filter(x => {
		return [OPENSEA_CONTRACT, OLD_OPENSEA_CONTRACT].includes(x.address.toLowerCase())
	});

	let seaportLogRaw = txReceipt.logs.filter(x => {
		return [OPENSEA_SEAPORT_CONTRACT_1_2, OPENSEA_SEAPORT_CONTRACT_1_4, OPENSEA_SEAPORT_CONTRACT_1_5].includes(x.address.toLowerCase())
	});

	let looksRareLogRaw = txReceipt.logs.filter(x => {
		return [
			Ethers.utils.keccak256(Ethers.utils.toUtf8Bytes('TakerBid(bytes32,uint256,address,address,address,address,address,uint256,uint256,uint256)')),
			Ethers.utils.keccak256(Ethers.utils.toUtf8Bytes('TakerAsk(bytes32,uint256,address,address,address,address,address,uint256,uint256,uint256)'))
		].includes(x.topics[0])
	});

	let blurLogRaw = txReceipt.logs.filter(x => {
		return [
			Ethers.utils.id('Execution721Packed(bytes32,uint256,uint256)'),
			Ethers.utils.id('Execution721TakerFeePacked(bytes32,uint256,uint256,uint256)')
		].includes(x.topics[0])
	});

	// early return check
	if (wyvernLogRaw.length === 0 && seaportLogRaw.length === 0 && looksRareLogRaw.length === 0 && blurLogRaw.length === 0) {
		console.log("found transfer, but no associated OpenSea (Wyvern or Seaport), LooksRare or Blur sale");
		return { qty: 0, card: 0, totalPrice: 0};
	}

	// check for OpenSea (Wyvern contract) sale
	if(wyvernLogRaw.length) {
		platforms.push("OpenSea")
		// Check if related token transfers instead of a regular ETH buy
		let tokenTransfers = txReceipt.logs.filter(x => {
			return x.address.toLowerCase() !== WRAPPER_CONTRACT && x.topics.includes(Ethers.utils.keccak256(Ethers.utils.toUtf8Bytes('Transfer(address,address,uint256)')))
		});

		// ERC20 token buy
		let decimals;
		if (tokenTransfers.length) {
			const tokenAddress = tokenTransfers[0].address.toLowerCase()
			const erc20TokenContract = new Ethers.Contract(tokenAddress, erc20TokenAbi, provider);

			const symbol = await erc20TokenContract.symbol()
			decimals = await erc20TokenContract.decimals()
			token = symbol
		}
		for (let log of wyvernLogRaw) {
			let wyvernLog = wyvernContract.interface.parseLog(log);

			if(tokenTransfers.length) {
				totalPrice += parseFloat(Ethers.utils.formatUnits(wyvernLog.args.price.toBigInt(), decimals))
			} else {
				// regular ETH buy
				totalPrice += parseFloat(Ethers.utils.formatEther(wyvernLog.args.price.toBigInt()));
			}
		}
	}

	// check for OpenSea (Seaport contract) sale
	if(seaportLogRaw.length) {
		platforms.push("OpenSea")
		// Check if related token transfers instead of a regular ETH buy
		let tokenTransfers = txReceipt.logs.filter(x => {
			return x.address.toLowerCase() !== WRAPPER_CONTRACT && x.topics.includes(Ethers.utils.keccak256(Ethers.utils.toUtf8Bytes('Transfer(address,address,uint256)')))
		});

		// ERC20 token buy
		let decimals;
		if (tokenTransfers.length) {
			const tokenAddress = tokenTransfers[0].address.toLowerCase()
			const erc20TokenContract = new Ethers.Contract(tokenAddress, erc20TokenAbi, provider);

			const symbol = await erc20TokenContract.symbol()
			decimals = await erc20TokenContract.decimals()
			token = symbol
		}
		for (let log of seaportLogRaw) {
			// added a try/catch, the event OrdersMatched apparently failed here
			try {
				let seaportLog = seaportContract.interface.parseLog(log);

				if(tokenTransfers.length) {
					totalPrice += parseFloat(Ethers.utils.formatUnits(seaportLog.args.offer[0].amount.toBigInt(), decimals))
				} else {
					// regular ETH buy

					// OrderFulfilled(bytes32 orderHash,address offerer,address zone,address recipient,(uint8 itemType,address token,uint256 identifier,uint256 amount)[],(uint8 itemType,address token,uint256 identifier,uint256 amount,address recipient)[])
					// OrderFulfilled(bytes32,address,address,address,(uint8,address,uint256,uint256)[],(uint8,address,uint256,uint256,address)[])
					// method 0x9d9af8e3

					try {
						// get the transfers of the last argument of the OrderFulfilled method
						for(let transfer of seaportLog.args[seaportLog.args.length-1]) {
							totalPrice += parseFloat(Ethers.utils.formatEther(Ethers.BigNumber.from(transfer.amount, 'hex')))
						}
					} catch(e) {
						// added some logging since the bot crashes on a rare occasion
						console.log(e)
						console.log(log)
					}
				}
			} catch(e) {
				// console.log(`Unable to parse log with logIndex: ${log.logIndex} of tx ${lastTx}`)
			}
		}
	}

	// check for LooksRare sale
	if(looksRareLogRaw.length) {
		platforms.push("LooksRare")
		for (let log of looksRareLogRaw) {
			let looksLog = looksContract.interface.parseLog(log);
			totalPrice += parseFloat(Ethers.utils.formatEther(looksLog.args.price.toBigInt()));
		}
		token = 'WETH'
	}

	// check for Blur sale
	if(blurLogRaw.length) {
		try {
			platforms.push("Blur")
			
			let tokenTransfers = txReceipt.logs.filter(x => {
				return x.address.toLowerCase() !== WRAPPER_CONTRACT && x.topics.includes(Ethers.utils.id('Transfer(address,address,uint256)'))
			});

			if(tokenTransfers.length) {
				// totalPrice += parseFloat(Ethers.utils.formatUnits(seaportLog.args.offer[0].amount.toBigInt(), decimals))
				let blurPoolLogRaw = txReceipt.logs.filter(x => {
					return x.address.toLowerCase() !== WRAPPER_CONTRACT && [
						Ethers.utils.id("Transfer(address,address,uint256)")
					].includes(x.topics[0])
				});

				for (let log of blurPoolLogRaw) {
					let blurLog = blurPoolContract.interface.parseLog(log);

					totalPrice += parseFloat(Ethers.utils.formatEther(blurLog.args.amount.toBigInt()));
				}

				token = 'WETH'
			} else {
				// regular ETH buy
				try {
					let txDetails = await provider.getTransaction(tx.transactionHash);
					totalPrice = parseFloat(Ethers.utils.formatEther(Ethers.BigNumber.from(txDetails.value, 'hex')))
				} catch(e) {
					console.log(e)
				}
			}
		} catch(e) {
			console.log(e)
			console.log(log)
		}
	}

	let logRaw = txReceipt.logs.filter(x => {
		return [WRAPPER_CONTRACT].includes(x.address.toLowerCase())
	});

	if (logRaw.length === 0) {
		console.error("unable to parse transfer from tx receipt!");
		return { qty: 0, token: 0, totalPrice: 0};
	}
	let ethPrice = await getEthUsdPrice()

	let data = []
	let buyer;
	let seller;
	let sellers = []

	for (let log of logRaw) {
		logEntry = contract.interface.parseLog(log);
		// which item was transferred?
		let item = parseInt(logEntry.args.tokenId, 10);
		sellers.push(logEntry.args.from.toLowerCase())
		buyer = logEntry.args.to.toLowerCase()
		data.push(item)
	}
	data.sort(function(a, b) { return a - b; })
	seller = (sellers.every((val, i, arr) => val === arr[0])) ? sellers[0] : seller = "Multiple" // Check if multiple sellers, if so, seller is "Multiple" instead of a single seller
	console.log(`Found sale: ${data.join(", ")} sold for ${totalPrice} ${token}`)
	return { data, totalPrice, buyer, seller, ethPrice, token, platforms };
}

function watchForTransfers(transferHandler) {
	provider.on(eventFilter, async (log) => {
		try {
			const transfer = await handleCurioTransfer(log);
			if (transfer.data) {
				transferHandler(transfer);
			}
		} catch (e) {
			console.error(e);
		}
	});
}

module.exports = { watchForTransfers, handleTransfer, getEventsFromBlock };
