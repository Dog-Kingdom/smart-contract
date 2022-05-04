const hre = require("hardhat");

const CONTRACT_NAME = "Marketplace";
const decimals = 10 ** 18;
const proxyType = { kind: "uups" };

async function main() {

  const [deployer] = await hre.ethers.getSigners();

  console.log("============================================================\n\r");
  console.log("Start time: ", Date(Date.now()));
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", ((await deployer.getBalance()) / decimals).toString());
  console.log("============================================================\n\r");

  const MarketplaceFactory = await hre.ethers.getContractFactory(CONTRACT_NAME)
  const MarketplaceArtifact = await hre.artifacts.readArtifact(CONTRACT_NAME)
  const MarketplaceContract = await hre.upgrades.deployProxy(MarketplaceFactory, [deployer.address, 5, 100], proxyType)
  await MarketplaceContract.deployed()

  // address feeReceiver_, address boxContract_

  const ImplementationAddress = await hre.upgrades.erc1967.getImplementationAddress(MarketplaceContract.address)
  console.log("====================================================")
  console.log("Gacha proxy address: ", MarketplaceContract.address)
  console.log("====================================================")
  console.log(`\x1b[36m${MarketplaceArtifact.contractName}\x1b[0m implementation address: \x1b[36m${ImplementationAddress}\x1b[0m\n\r`)

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });