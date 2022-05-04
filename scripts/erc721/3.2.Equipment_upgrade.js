const hre = require("hardhat");
const { STAGING } = require('../.deployment_data_test.json');

const CONTRACT_NAME_V1 = "EquipmentContract"
const CONTRACT_NAME_V2 = "EquipmentContract"
const PROXY_ADDRESS = STAGING.Equipment
const decimals = 10 ** 18;

async function main() {

  const [deployer] = await hre.ethers.getSigners();

  console.log("============================================================\n\r");
  console.log("Start time: ", Date(Date.now()));
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", ((await deployer.getBalance()) / decimals).toString());
  console.log("============================================================\n\r");

  const EquipmentFactoryV1     = await hre.ethers.getContractFactory(CONTRACT_NAME_V1);
  const EquipmentArtifactV1    = await hre.artifacts.readArtifact(CONTRACT_NAME_V1);
  console.log("Equipment proxy address: ",PROXY_ADDRESS)
  const EquipmentContractV1    = EquipmentFactoryV1.attach(PROXY_ADDRESS);

  const EquipmentImplV1        = await hre.upgrades.erc1967.getImplementationAddress(EquipmentContractV1.address);

  console.log(`Upgrading \x1b[36m${EquipmentArtifactV1.contractName}\x1b[0m at proxy: \x1b[36m${EquipmentContractV1.address}\x1b[0m`);
  console.log(`Current implementation address: \x1b[36m${EquipmentImplV1}\x1b[0m`);

  const EquipmentFactoryV2     = await hre.ethers.getContractFactory(CONTRACT_NAME_V2);
  const EquipmentArtifactV2    = await hre.artifacts.readArtifact(CONTRACT_NAME_V2);
  const EquipmentContractV2    = await hre.upgrades.upgradeProxy(EquipmentContractV1, EquipmentFactoryV2);
  
  await EquipmentContractV2.deployed();

  const ImplementationAddress = await hre.upgrades.erc1967.getImplementationAddress(EquipmentContractV2.address)
  console.log("====================================================")
  console.log("Equipment proxy address: ", EquipmentContractV2.address)
  console.log("====================================================")
  console.log(`\x1b[36m${EquipmentArtifactV2.contractName}\x1b[0m implementation address: \x1b[36m${ImplementationAddress}\x1b[0m\n\r`)

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });