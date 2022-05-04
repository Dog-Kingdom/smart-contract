# Dog-kingdom smart contract

## System Installation Requirements

- Npm
- Git
- Hardhat

## Development

* [A Prettier plugin for automatically formatting your Solidity code.](https://github.com/prettier-solidity/prettier-plugin-solidity)

```shell
npm run prettier
```

* [solhint - helps enforce standards your Solidity code. This provides both Security and Style Guide validations.](https://protofire.github.io/solhint/)

```shell
npm install -g solhint
solhint --init
npm run lint
```

## Add configurations

1. Fork & clone project

2. Install dependencies

```shell
npm install or yarn
```

3. Config file .env The file `hardhat.config.js` uses some environment variables from `.env`. However, this file is not
   included here because of privacy. Please use your own keys:

```dotenv
BSC_PROVIDER="https://bsc-dataseed.binance.org/"
BSC_TESTNET_PROVIDER="https://data-seed-prebsc-1-s1.binance.org:8545/"
BSC_API_KEY="..." ; API key is used for verify smart contract. you can register account on bscscan.com and create your api key
MNEMONIC="..." ; fill your mnemonic, make sure it had BNB in the first wallet of mnemonic
ADDRESS_1="..."
PRIVATE_KEY_1="..." ; (optional: if you do not use mnemonic to deploy, you can paste your private key here. Recommendation: using private key to deploy)
```

## Deploy the contracts

1. Open the file `scripts/<token-type>/{1-deploy.js or 1-deploy-proxy.js}`.

2. Provide the name of the contract you want to deploy:

```dotenv
CONTRACT_NAME = "..."
```

3. Provide necessary parameters in the function `factory.deploy(...)`:

With contract not upgradeable

```javascript
const contract = await factory.deploy(PARAM_1, PARAM_2)
```

or With contract upgradeable

```javascript
// Provide constructor parameters here
const contract = await factory.deployProxy(
  factory,
  [
    PARAM_1,
    PARAM_2
  ],
  {kind: "uups"}
)
```

4. Execute the following command to deploy:
   We recommend deploying on testnet environment first to check transactions on testnet explorer.

       Network name:
       - bscmainnet: Binance Smart Chain Mainnet
       - bsctestnet: Binance Smart Chain Testnet

```shell
npx hardhat run scripts/<token-type>/<1-deploy.js or 1-deploy-proxy.js>`--network <network-name>
```

## Verify contracts

Use

```shell
npx hardhat verify <contract-address> <param-constructor-if-any> --network <network-name>
```

to verify the contract. Note that this contract **MUST** be deployed before using Hardhat.

## Test contracts

Use

```shell
npx hardhat test <path-to-js-test-file>
``` 

to run the JS test file.

## Upgrade contracts

1. Open the file `scripts/<token-type>/2-deploy-proxy.js`
2. Provide the name of the contract you want to deploy

```dotenv
PROXY_ADDRESS=
```

```dotenv
CONTRACT_NAME_V1=
CONTRACT_NAME_V2=
```

3. Execute the following command to upgrade:
   We recommend deploying on testnet environment first to check transactions on testnet explorer. Network name:

* `bscmainnet`: Binance Smart Chain Mainnet
* `bsctestnet`: Binance Smart Chain Testnet

```shell
npx hardhat run scripts/<token-type>/1-deploy-proxy.js`--network <network-name>
```
