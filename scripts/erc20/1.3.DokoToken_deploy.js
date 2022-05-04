const hre = require("hardhat");
const { Proxies } = require('../.deployment_data_test.json');

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

  const DKTokenFactory = await hre.ethers.getContractFactory(CONTRACT_NAME);
  const DKTokenArtifact = await hre.artifacts.readArtifact(CONTRACT_NAME);
  const DKTokenContract = await DKTokenFactory.deploy(
    deployArguments.tokenName,
    deployArguments.tokenSymbol,
    deployArguments.maxSupply, 
    deployArguments.ownerAddress)
  await DKTokenContract.deployed();

  const DKImplementationAddress = await hre.upgrades.erc1967.getImplementationAddress(DKTokenContract.address);
  console.log("====================================================")
  console.log("DK Token proxy address: ", DKTokenContract.address)
  console.log("====================================================")
  console.log(`\x1b[36m${DKTokenArtifact.contractName}\x1b[0m implementation address: \x1b[36m${DKImplementationAddress}\x1b[0m\n\r`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });