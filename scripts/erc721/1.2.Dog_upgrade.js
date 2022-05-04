const hre = require("hardhat");
const { DEV } = require('../.deployment_data_test.json');

const CONTRACT_NAME_V1 = "DogContract"
const CONTRACT_NAME_V2 = "DogContract"
const PROXY_ADDRESS = DEV.DOG
const decimals = 10 ** 18;

async function main() {


  const [deployer] = await hre.ethers.getSigners();

  console.log("============================================================\n\r");
  console.log("Start time: ", Date(Date.now()));
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", ((await deployer.getBalance()) / decimals).toString());
  console.log("============================================================\n\r");

  const DogFactoryV1     = await hre.ethers.getContractFactory(CONTRACT_NAME_V1);
  const DogArtifactV1    = await hre.artifacts.readArtifact(CONTRACT_NAME_V1);
  console.log("Dog proxy address: ",PROXY_ADDRESS)
  const DogContractV1    = DogFactoryV1.attach(PROXY_ADDRESS);

  const DogImplV1        = await hre.upgrades.erc1967.getImplementationAddress(DogContractV1.address);

  console.log(`Upgrading \x1b[36m${DogArtifactV1.contractName}\x1b[0m at proxy: \x1b[36m${DogContractV1.address}\x1b[0m`);
  console.log(`Current implementation address: \x1b[36m${DogImplV1}\x1b[0m`);

  const DogFactoryV2     = await hre.ethers.getContractFactory(CONTRACT_NAME_V2);
  const DogArtifactV2    = await hre.artifacts.readArtifact(CONTRACT_NAME_V2);
  const DogContractV2    = await hre.upgrades.upgradeProxy(DogContractV1, DogFactoryV2);
  
  await DogContractV2.deployed();

  const ImplementationAddress = await hre.upgrades.erc1967.getImplementationAddress(DogContractV2.address)
  console.log("====================================================")
  console.log("Dog proxy address: ", DogContractV2.address)
  console.log("====================================================")
  console.log(`\x1b[36m${DogArtifactV2.contractName}\x1b[0m implementation address: \x1b[36m${ImplementationAddress}\x1b[0m\n\r`)

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });