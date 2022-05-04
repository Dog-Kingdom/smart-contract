const hre = require("hardhat");
const { STAGING } = require('../.deployment_data_test.json');

const CONTRACT_NAME_V1 = "BoxContract"
const CONTRACT_NAME_V2 = "BoxContract"
const PROXY_ADDRESS = STAGING.BOX
const decimals = 10 ** 18;

async function main() {


  const [deployer] = await hre.ethers.getSigners();

  console.log("============================================================\n\r");
  console.log("Start time: ", Date(Date.now()));
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", ((await deployer.getBalance()) / decimals).toString());
  console.log("============================================================\n\r");

  const BoxFactoryV1     = await hre.ethers.getContractFactory(CONTRACT_NAME_V1);
  const BoxArtifactV1    = await hre.artifacts.readArtifact(CONTRACT_NAME_V1);
  console.log("Box proxy address: ",PROXY_ADDRESS)
  const BoxContractV1    = BoxFactoryV1.attach(PROXY_ADDRESS);

  const BoxImplV1        = await hre.upgrades.erc1967.getImplementationAddress(BoxContractV1.address);

  console.log(`Upgrading \x1b[36m${BoxArtifactV1.contractName}\x1b[0m at proxy: \x1b[36m${BoxContractV1.address}\x1b[0m`);
  console.log(`Current implementation address: \x1b[36m${BoxImplV1}\x1b[0m`);

  const BoxFactoryV2     = await hre.ethers.getContractFactory(CONTRACT_NAME_V2);
  const BoxArtifactV2    = await hre.artifacts.readArtifact(CONTRACT_NAME_V2);
  const BoxContractV2    = await hre.upgrades.upgradeProxy(BoxContractV1, BoxFactoryV2);
  
  await BoxContractV2.deployed();

  const ImplementationAddress = await hre.upgrades.erc1967.getImplementationAddress(BoxContractV2.address)
  console.log("====================================================")
  console.log("Box proxy address: ", BoxContractV2.address)
  console.log("====================================================")
  console.log(`\x1b[36m${BoxArtifactV2.contractName}\x1b[0m implementation address: \x1b[36m${ImplementationAddress}\x1b[0m\n\r`)

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });