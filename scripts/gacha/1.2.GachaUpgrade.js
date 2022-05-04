const hre = require("hardhat");
const { DEV } = require('../.deployment_data_test.json');

const CONTRACT_NAME_V1 = "Gacha"
const CONTRACT_NAME_V2 = "Gacha"
const PROXY_ADDRESS = DEV.GachaMock
const decimals = 10 ** 18;

async function main() {

  const [deployer] = await hre.ethers.getSigners();

  console.log("============================================================\n\r");
  console.log("Start time: ", Date(Date.now()));
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", ((await deployer.getBalance()) / decimals).toString());
  console.log("============================================================\n\r");

  const GachaFactoryV1     = await hre.ethers.getContractFactory(CONTRACT_NAME_V1);
  const GachaArtifactV1    = await hre.artifacts.readArtifact(CONTRACT_NAME_V1);
  console.log("gacha proxy address: ",PROXY_ADDRESS)
  const GachaContractV1    = GachaFactoryV1.attach(PROXY_ADDRESS);
  
  const GachaImplV1        = await hre.upgrades.erc1967.getImplementationAddress(GachaContractV1.address);

  console.log(`Upgrading \x1b[36m${GachaArtifactV1.contractName}\x1b[0m at proxy: \x1b[36m${GachaContractV1.address}\x1b[0m`);
  console.log(`Current implementation address: \x1b[36m${GachaImplV1}\x1b[0m`);

  const GachaFactoryV2     = await hre.ethers.getContractFactory(CONTRACT_NAME_V2);
  const GachaArtifactV2    = await hre.artifacts.readArtifact(CONTRACT_NAME_V2);
  const GachaContractV2    = await hre.upgrades.upgradeProxy(GachaContractV1, GachaFactoryV2);
  
  await GachaContractV2.deployed();
  //address feeReceiver_, address boxContract_

  const ImplementationAddress = await hre.upgrades.erc1967.getImplementationAddress(GachaContractV2.address)
  console.log("====================================================")
  console.log("Gacha proxy address: ", GachaContractV2.address)
  console.log("====================================================")
  console.log(`\x1b[36m${GachaArtifactV2.contractName}\x1b[0m implementation address: \x1b[36m${ImplementationAddress}\x1b[0m\n\r`)

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });