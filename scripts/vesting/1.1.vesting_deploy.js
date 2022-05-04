const hre = require("hardhat");
const { UAT } = require('../.deployment_data_test.json');

const CONTRACT_NAME = "Vesting";

const params = {
  decimals: 10 ** 18,
  proxyType: { kind: "uups" },
  dokoToken: UAT.DOKOTOKEN
}

async function main() {

  const [deployer] = await hre.ethers.getSigners();

  console.log("============================================================\n\r");
  console.log("Start time: ", Date(Date.now()));
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", ((await deployer.getBalance()) / params.decimals).toString());
  console.log("============================================================\n\r");

  const VestingFactory = await hre.ethers.getContractFactory(CONTRACT_NAME)
  const VestingArtifact = await hre.artifacts.readArtifact(CONTRACT_NAME)
  const VestingContract = await hre.upgrades.deployProxy(VestingFactory, [params.dokoToken, deployer.address], params.proxyType)
  await VestingContract.deployed()

  // address feeReceiver_, address boxContract_

  const ImplementationAddress = await hre.upgrades.erc1967.getImplementationAddress(VestingContract.address)
  console.log("====================================================")
  console.log("Vesting proxy address: ", VestingContract.address)
  console.log("====================================================")
  console.log(`\x1b[36m${VestingArtifact.contractName}\x1b[0m implementation address: \x1b[36m${ImplementationAddress}\x1b[0m\n\r`)

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });