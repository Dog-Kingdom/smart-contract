const hre = require("hardhat");
const { DEV } = require('../.deployment_data_test.json');

const CONTRACT_NAME_V1 = "Deposit"
const CONTRACT_NAME_V2 = "Deposit"
const PROXY_ADDRESS = DEV.DEPOSIT
const params = {
  decimals: 10 ** 18,
}
// const DepositAddress = "0x28Ae49e33A73e29c3A338C638303199aF1E219e4"

async function main() {

  const [deployer] = await hre.ethers.getSigners();

  console.log("============================================================\n\r");
  console.log("Start time: ", Date(Date.now()));
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", ((await deployer.getBalance()) / params.decimals).toString());
  console.log("============================================================\n\r");

  const DepositFactoryV1     = await hre.ethers.getContractFactory(CONTRACT_NAME_V1);
  const DepositArtifactV1    = await hre.artifacts.readArtifact(CONTRACT_NAME_V1);
  console.log("Deposit proxy address: ",PROXY_ADDRESS)
  const DepositContractV1    = DepositFactoryV1.attach(PROXY_ADDRESS);
  
  const DepositImplV1        = await hre.upgrades.erc1967.getImplementationAddress(DepositContractV1.address);

  console.log(`Upgrading \x1b[36m${DepositArtifactV1.contractName}\x1b[0m at proxy: \x1b[36m${DepositContractV1.address}\x1b[0m`);
  console.log(`Current implementation address: \x1b[36m${DepositImplV1}\x1b[0m`);

  const DepositFactoryV2     = await hre.ethers.getContractFactory(CONTRACT_NAME_V2);
  const DepositArtifactV2    = await hre.artifacts.readArtifact(CONTRACT_NAME_V2);
  const DepositContractV2    = await hre.upgrades.upgradeProxy(DepositContractV1, DepositFactoryV2);
  
  await DepositContractV2.deployed();
  //address feeReceiver_, address boxContract_

  const ImplementationAddress = await hre.upgrades.erc1967.getImplementationAddress(DepositContractV2.address)
  console.log("====================================================")
  console.log("Deposit proxy address: ", DepositContractV2.address)
  console.log("====================================================")
  console.log(`\x1b[36m${DepositArtifactV2.contractName}\x1b[0m implementation address: \x1b[36m${ImplementationAddress}\x1b[0m\n\r`)

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });