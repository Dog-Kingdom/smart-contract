const hre = require("hardhat");
const { DEV } = require('../.deployment_data_test.json');

const CONTRACT_NAME = "Deposit"
const params = {
  decimals: 10 ** 18,
  proxyType: { kind: "uups" },
}

const deployArguments = {
  dogContract: DEV.Dog,
  equipmentContract: DEV.Equipment,
  dkTokenContract: DEV.DKTOKEN,
  vaultContract: DEV.VAULT,
  ownerAddress: "<OWNER_ADDRESS>"
}

async function main() {

  const [deployer] = await hre.ethers.getSigners();

  console.log("============================================================\n\r");
  console.log("Start time: ", Date(Date.now()));
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", ((await deployer.getBalance()) / params.decimals).toString());
  console.log("============================================================\n\r");

  const DepositFactory = await hre.ethers.getContractFactory(CONTRACT_NAME)
  const DepositArtifact = await hre.artifacts.readArtifact(CONTRACT_NAME)

  const DepositContract = await hre.upgrades.deployProxy(
    DepositFactory, 
    [
      deployArguments.dkTokenContract, 
      deployArguments.dogContract, 
      deployArguments.equipmentContract, 
      deployArguments.vaultContract, 
      deployArguments.ownerAddress
    ], 
    params.proxyType)
  await DepositContract.deployed()

  const ImplementationAddress = await hre.upgrades.erc1967.getImplementationAddress(DepositContract.address)

  console.log("====================================================")
  console.log("deposit proxy address: ", DepositContract.address)
  console.log("====================================================")
  console.log(`\x1b[36m${DepositArtifact.contractName}\x1b[0m implementation address: \x1b[36m${ImplementationAddress}\x1b[0m\n\r`)

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });