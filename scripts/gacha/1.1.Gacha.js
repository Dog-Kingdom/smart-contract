const hre = require("hardhat");
const { DEV } = require('../.deployment_data_test.json');

const decimals = 10 ** 18;
const proxyType = { kind: "uups" };
const CONTRACT_NAME = "Gacha";

async function main() {

  const [deployer] = await hre.ethers.getSigners();

  console.log("============================================================\n\r");
  console.log("Start time: ", Date(Date.now()));
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", ((await deployer.getBalance()) / decimals).toString());
  console.log("============================================================\n\r");

  const GachaFactory = await hre.ethers.getContractFactory(CONTRACT_NAME)
  const GachaArtifact = await hre.artifacts.readArtifact(CONTRACT_NAME)
  const GachaContract = await hre.upgrades.deployProxy(GachaFactory, [deployer.address, DEV.BOX], proxyType)
  await GachaContract.deployed()

  const ImplementationAddress = await hre.upgrades.erc1967.getImplementationAddress(GachaContract.address)
  console.log("====================================================")
  console.log("Gacha proxy address: ", GachaContract.address)
  console.log("====================================================")
  console.log(`\x1b[36m${GachaArtifact.contractName}\x1b[0m implementation address: \x1b[36m${ImplementationAddress}\x1b[0m\n\r`)

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });