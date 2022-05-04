const hre = require("hardhat");

const decimals = 10 ** 18;
const DKTokenBuildName = "DKToken";

async function main() {

  const [deployer] = await hre.ethers.getSigners();

  console.log("============================================================\n\r");
  console.log("Start time: ", Date(Date.now()));
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", ((await deployer.getBalance()) / decimals).toString());
  console.log("============================================================\n\r");

  const DKTokenFactory = await hre.ethers.getContractFactory(DKTokenBuildName)
  const DKTokenArtifact = await hre.artifacts.readArtifact(DKTokenBuildName)
  const DKTokenContract = await hre.upgrades.deployProxy(DKTokenFactory, ["DK", "DK", deployer.address], { kind: "uups"})
  await DKTokenContract.deployed()

  const DKImplementationAddress = await hre.upgrades.erc1967.getImplementationAddress(DKTokenContract.address);
  console.log("====================================================")
  console.log("DK Token proxy address: ", DKTokenContract.address)
  console.log("====================================================")
  console.log(`\x1b[36m${DKTokenArtifact.contractName}\x1b[0m implementation address: \x1b[36m${DKImplementationAddress}\x1b[0m\n\r`);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });