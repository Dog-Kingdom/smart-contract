const hre = require("hardhat");

const decimals = 10 ** 18;

const CONTRACT_NAME = "DokoToken";

const deployArguments = {
  tokenName: "...",
  tokenSymbol: "...",
  maxSupply: "...",
  ownerAddress: "<OWNER_ADDRESS>"
}

async function main() {
  const [deployer] = await hre.ethers.getSigners()

  const DoKoTokenFactory = await hre.ethers.getContractFactory(CONTRACT_NAME)
  const DoKoTokenContract = await DoKoTokenFactory.deploy(
    deployArguments.tokenName,
    deployArguments.tokenSymbol,
    deployArguments.maxSupply, 
    deployArguments.ownerAddress)
  await DoKoTokenContract.deployed()

  console.log("====================================================")
  console.log("DK Token proxy address: ", DoKoTokenContract.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });