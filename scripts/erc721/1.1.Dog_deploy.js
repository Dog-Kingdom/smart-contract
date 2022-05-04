const hre = require("hardhat")

const CONTRACT_NAME = "DogContract"
const decimals = 10 ** 18;
const proxyType = { kind: "uups" }

async function main() {

  const [deployer] = await hre.ethers.getSigners();

  console.log("============================================================\n\r");
  console.log("Start time: ", Date(Date.now()));
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", ((await deployer.getBalance()) / decimals).toString());
  console.log("============================================================\n\r");

  const DogFactory = await hre.ethers.getContractFactory(CONTRACT_NAME)
  const DogArtifact = await hre.artifacts.readArtifact(CONTRACT_NAME)
  const DogContract = await hre.upgrades.deployProxy(DogFactory, ["Dog kingdom", "Dog", deployer.address], proxyType)
  await DogContract.deployed()

  // string memory name_,
  // string memory symbol_,
  // address ownerAddress_

  const ImplementationAddress = await hre.upgrades.erc1967.getImplementationAddress(DogContract.address)
  console.log("====================================================")
  console.log("Dog proxy address: ", DogContract.address)
  console.log("====================================================")
  console.log(`\x1b[36m${DogArtifact.contractName}\x1b[0m implementation address: \x1b[36m${ImplementationAddress}\x1b[0m\n\r`)

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });