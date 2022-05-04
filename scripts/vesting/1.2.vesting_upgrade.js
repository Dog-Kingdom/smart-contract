const hre = require("hardhat");
const { DEV } = require('../.deployment_data_test.json');

const decimals = 10 ** 18;
const VestingBuildNameV1 = "Vesting"
const VestingBuildNameV2 = "Vesting"
const VestingAddress = DEV.VESTING
// const GachaAddress = "0x4aA125E33cD6334Ae754a978779E12B311a4b291"

async function main() {

  const [deployer] = await hre.ethers.getSigners();

  console.log("============================================================\n\r");
  console.log("Start time: ", Date(Date.now()));
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", ((await deployer.getBalance()) / decimals).toString());
  console.log("============================================================\n\r");

  const VestingFactoryV1     = await hre.ethers.getContractFactory(VestingBuildNameV1);
  const VestingArtifactV1    = await hre.artifacts.readArtifact(VestingBuildNameV1);
  console.log("Vesting proxy address: ",VestingAddress)
  const VestingContractV1    = VestingFactoryV1.attach(VestingAddress);
  
  const VestingImplV1        = await hre.upgrades.erc1967.getImplementationAddress(VestingContractV1.address);

  console.log(`Upgrading \x1b[36m${VestingArtifactV1.contractName}\x1b[0m at proxy: \x1b[36m${VestingContractV1.address}\x1b[0m`);
  console.log(`Current implementation address: \x1b[36m${VestingImplV1}\x1b[0m`);

  const VestingFactoryV2     = await hre.ethers.getContractFactory(VestingBuildNameV2);
  const VestingArtifactV2    = await hre.artifacts.readArtifact(VestingBuildNameV2);
  const VestingContractV2    = await hre.upgrades.upgradeProxy(VestingContractV1, VestingFactoryV2);
  
  await VestingContractV2.deployed();
  //address feeReceiver_, address boxContract_

  const ImplementationAddress = await hre.upgrades.erc1967.getImplementationAddress(VestingContractV2.address)
  console.log("====================================================")
  console.log("Vesting proxy address: ", VestingContractV2.address)
  console.log("====================================================")
  console.log(`\x1b[36m${VestingArtifactV2.contractName}\x1b[0m implementation address: \x1b[36m${ImplementationAddress}\x1b[0m\n\r`)

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });