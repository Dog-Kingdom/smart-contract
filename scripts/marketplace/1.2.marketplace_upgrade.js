const hre = require("hardhat");
const { DEV } = require('../.deployment_data_test.json');

const decimals = 10 ** 18;
const CONTRACT_NAME_V1 = "Marketplace"
const CONTRACT_NAME_V2 = "Marketplace"
const PROXY_ADDRESS = DEV.marketplace

async function main() {

  const [deployer] = await hre.ethers.getSigners();

  console.log("============================================================\n\r");
  console.log("Start time: ", Date(Date.now()));
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", ((await deployer.getBalance()) / decimals).toString());
  console.log("============================================================\n\r");

  const MarketplaceFactoryV1     = await hre.ethers.getContractFactory(CONTRACT_NAME_V1);
  const MarketplaceArtifactV1    = await hre.artifacts.readArtifact(CONTRACT_NAME_V1);
  console.log("Marketplace proxy address: ",PROXY_ADDRESS)
  const MarketplaceContractV1    = MarketplaceFactoryV1.attach(PROXY_ADDRESS);
  
  const MarketplaceImplV1        = await hre.upgrades.erc1967.getImplementationAddress(MarketplaceContractV1.address);

  console.log(`Upgrading \x1b[36m${MarketplaceArtifactV1.contractName}\x1b[0m at proxy: \x1b[36m${MarketplaceContractV1.address}\x1b[0m`);
  console.log(`Current implementation address: \x1b[36m${MarketplaceImplV1}\x1b[0m`);

  const MarketplaceFactoryV2     = await hre.ethers.getContractFactory(CONTRACT_NAME_V2);
  const MarketplaceArtifactV2    = await hre.artifacts.readArtifact(CONTRACT_NAME_V2);
  const MarketplaceContractV2    = await hre.upgrades.upgradeProxy(MarketplaceContractV1, MarketplaceFactoryV2);
  
  await MarketplaceContractV2.deployed();
  //address feeReceiver_, address boxContract_

  const ImplementationAddress = await hre.upgrades.erc1967.getImplementationAddress(MarketplaceContractV2.address)
  console.log("====================================================")
  console.log("Marketplace proxy address: ", MarketplaceContractV2.address)
  console.log("====================================================")
  console.log(`\x1b[36m${MarketplaceArtifactV2.contractName}\x1b[0m implementation address: \x1b[36m${ImplementationAddress}\x1b[0m\n\r`)

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });