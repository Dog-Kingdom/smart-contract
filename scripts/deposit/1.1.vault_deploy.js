const hre = require("hardhat");

const CONTRACT_NAME = "Vault"
const params = {
  decimals: 10 ** 18,
  proxyType: { kind: "uups" }
}

const deployArguments = {
  ownerAddress: "<OWNER_ADDRESS>"
}

async function main() {

  const [deployer] = await hre.ethers.getSigners();

  console.log("============================================================\n\r");
  console.log("Start time: ", Date(Date.now()));
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", ((await deployer.getBalance()) / params.decimals).toString());
  console.log("============================================================\n\r");

  const vaultFactory = await hre.ethers.getContractFactory(CONTRACT_NAME)
  const VaultArtifact = await hre.artifacts.readArtifact(CONTRACT_NAME)

  const VaultContract = await hre.upgrades.deployProxy(vaultFactory,deployArguments.ownerAddress, params.proxyType)
  await VaultContract.deployed()

  const ImplementationAddress = await hre.upgrades.erc1967.getImplementationAddress(VaultContract.address)

  console.log("====================================================")
  console.log("vault proxy address: ", VaultContract.address)
  console.log("====================================================")
  console.log(`\x1b[36m${VaultArtifact.contractName}\x1b[0m implementation address: \x1b[36m${ImplementationAddress}\x1b[0m\n\r`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });