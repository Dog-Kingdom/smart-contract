const hre = require("hardhat")

const CONTRACT_NAME = "EquipmentContract"
const decimals = 10 ** 18
const proxyType = { kind: "uups" }

async function main() {

  const [deployer] = await hre.ethers.getSigners();

  console.log("============================================================\n\r");
  console.log("Start time: ", Date(Date.now()));
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", ((await deployer.getBalance()) / decimals).toString());
  console.log("============================================================\n\r");

  const EquipmentFactory = await hre.ethers.getContractFactory(CONTRACT_NAME)
  const EquipmentArtifact = await hre.artifacts.readArtifact(CONTRACT_NAME)
  const EquipmentContract = await hre.upgrades.deployProxy(EquipmentFactory, ["Dog's Equipment", "Equipment", deployer.address], proxyType)
  await EquipmentContract.deployed()

  const ImplementationAddress = await hre.upgrades.erc1967.getImplementationAddress(EquipmentContract.address)
  console.log("====================================================")
  console.log("Equipment proxy address: ", EquipmentContract.address)
  console.log("====================================================")
  console.log(`\x1b[36m${EquipmentArtifact.contractName}\x1b[0m implementation address: \x1b[36m${ImplementationAddress}\x1b[0m\n\r`)

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });