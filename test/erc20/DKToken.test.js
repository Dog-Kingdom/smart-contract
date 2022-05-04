require('@nomiclabs/hardhat-ethers')
require("@nomiclabs/hardhat-web3")
const hre = require("hardhat");
const { expect } = require("chai");
const assert = require("assert");
const { info } = require('console');
const { BigNumber } = require('ethers');
const artifactERC20 = "DokoToken";
const artifactVest = "BotProtection";
const zero_address = "0x0000000000000000000000000000000000000000";
const ERC20WithBotProtect = require('../../artifacts/contracts/erc20/DokoToken.sol/DokoToken.json');
const { web3 } = require('hardhat');

describe("Bot Protect", async () => {

    let accounts = null;
    let accs = null;
    let erc20Contract = null;
    let botProtectionContract = null;
    let today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    before(async () => {
        accounts = await hre.ethers.getSigners()
        accs = await web3.eth.getAccounts()
        //deploy erc20 contract
        const TokenERC20Factory = await hre.ethers.getContractFactory(artifactERC20);
        const paramDeployERC20 = {
            name: "Doko Token",
            symbol: "Doko",
            totalSupply: web3.utils.toWei("500000000", "ether"),
            ownerAddress: accounts[0].address
        }
        const _contractTokenERC20 = await TokenERC20Factory.deploy(
            paramDeployERC20.name,
            paramDeployERC20.symbol,
            paramDeployERC20.totalSupply,
            paramDeployERC20.ownerAddress
        );
        erc20Contract = await _contractTokenERC20.deployed();

        //deploy BotProtection contract
        const ContractBotProtection = await hre.ethers.getContractFactory(artifactVest)
        const paramDeployBotProtection = {
            addressBuyLimit: web3.utils.toWei("200", "ether"),
            addressSellLimit: web3.utils.toWei("300", "ether"),
            dexBuyLimit: web3.utils.toWei("200", "ether"),
            dexSellLimit: web3.utils.toWei("300", "ether"),
            blockTransferLimit: web3.utils.toWei("500", "ether"),
            ownerAddress: accounts[0].address
        }
        const _contractBotProtection = await hre.upgrades.deployProxy(
            ContractBotProtection,
            [
                paramDeployBotProtection.addressBuyLimit,
                paramDeployBotProtection.addressSellLimit,
                paramDeployBotProtection.dexBuyLimit,
                paramDeployBotProtection.dexSellLimit,
                paramDeployBotProtection.blockTransferLimit,
                paramDeployBotProtection.ownerAddress
            ],   // Provide constructor parameters here
            { kind: "uups" }
        );
        botProtectionContract = await _contractBotProtection.deployed();
    });
    describe("BotProtection Contract", async () => {
        it("Check data after deploy", async () => {
            expect(await botProtectionContract.addressBuyLimit()).to.equal(web3.utils.toWei("200", "ether"))
            expect(await botProtectionContract.addressSellLimit()).to.equal(web3.utils.toWei("300", "ether"))
            expect(await botProtectionContract.dexBuyLimit()).to.equal(web3.utils.toWei("200", "ether"))
            expect(await botProtectionContract.dexSellLimit()).to.equal(web3.utils.toWei("300", "ether"))
            expect(await botProtectionContract.blockTransferLimit()).to.equal(web3.utils.toWei("500", "ether"))
            expect(await erc20Contract.owner()).to.equal(accounts[0].address)

            // await expect(erc20Contract.connect(accounts[0]).transfer(accounts[1].address, web3.utils.toWei("20000", "ether"))).to.revertedWith('Pausable: paused')
        })

        it("Set Limited", async () => {
            const limited = {
                addressBuyLimit: web3.utils.toWei("700", "ether"),
                addressSellLimit: web3.utils.toWei("600", "ether"),
                dexBuyLimit: web3.utils.toWei("700", "ether"),
                dexSellLimit: web3.utils.toWei("600", "ether"),
                blockTransferLimit: web3.utils.toWei("1300", "ether")
            }

            // use address is not owner
            await expect(botProtectionContract.connect(accounts[1]).setLimit(
                limited.addressBuyLimit,
                limited.addressSellLimit,
                limited.dexBuyLimit,
                limited.dexSellLimit,
                limited.blockTransferLimit
            )).to.be.revertedWith('Ownable: caller is not the owner')
            // use owner
            let tx = await botProtectionContract.connect(accounts[0]).setLimit(
                limited.addressBuyLimit,
                limited.addressSellLimit,
                limited.dexBuyLimit,
                limited.dexSellLimit,
                limited.blockTransferLimit
            )
            tx = await tx.wait()
            let event = tx.events[0].args;
            expect(event.dexBuyLimit).to.equal(limited.dexBuyLimit)
            expect(event.dexSellLimit).to.equal(limited.dexSellLimit)
            expect(event.blockTransferLimit).to.equal(limited.blockTransferLimit)
            expect(await botProtectionContract.dexBuyLimit()).to.equal(limited.dexBuyLimit)
            expect(await botProtectionContract.dexSellLimit()).to.equal(limited.dexSellLimit)
            expect(await botProtectionContract.blockTransferLimit()).to.equal(limited.blockTransferLimit)
        })

        it("Set exchange address", async () => {
            // use address is not owner
            await expect(botProtectionContract.connect(accounts[1]).setExchangeAddress(
                accounts[1].address,
                true
            )).to.be.revertedWith('Ownable: caller is not the owner')

            //use owner
            // // add exchange address
            let tx = await botProtectionContract.connect(accounts[0]).setExchangeAddress(
                accounts[1].address,
                true
            )
            tx = await tx.wait()
            let event = tx.events[0].args;
            expect(event.exchangeAddress).to.equal(accounts[1].address)
            expect(event.isExchangeAddress).to.true
            expect(await botProtectionContract.isExchangeAddress(accounts[1].address)).to.true

            tx = await botProtectionContract.connect(accounts[0]).setExchangeAddress(
                accounts[1].address,
                false
            )
            tx = await tx.wait()
            event = tx.events[0].args;
            expect(event.exchangeAddress).to.equal(accounts[1].address)
            expect(event.isExchangeAddress).to.false
            expect(await botProtectionContract.isExchangeAddress(accounts[1].address)).to.false

            await botProtectionContract.connect(accounts[0]).setExchangeAddress(
                accounts[1].address,
                true
            )
            await botProtectionContract.connect(accounts[0]).setExchangeAddress(
                accounts[2].address,
                true
            )
        })
    })

    describe("ERC20 Contract Implement BotProtection", async () => {
        it("Check data after deploy", async () => {
            expect(await erc20Contract.botProtectionContract()).to.equal(zero_address)
            expect(await erc20Contract.botProtectionEnabled()).to.false

            // await erc20Contract.connect(accounts[0]).unpause();
            await erc20Contract.connect(accounts[0]).mint(accounts[0].address, web3.utils.toWei("499995000", "ether"));
            let balanceAccount0Before = await erc20Contract.balanceOf(accounts[0].address)
            await erc20Contract.connect(accounts[0]).transfer(accounts[1].address, web3.utils.toWei("20000", "ether"))
            expect(await erc20Contract.balanceOf(accounts[1].address)).to.equal(web3.utils.toWei("20000", "ether"))
            let balanceAccount0After = BigInt(balanceAccount0Before) - BigInt(web3.utils.toWei("20000", "ether"));
            expect(await erc20Contract.balanceOf(accounts[0].address)).to.equal(balanceAccount0After)
            await erc20Contract.connect(accounts[1]).transfer(accounts[3].address, web3.utils.toWei("5000", "ether"))
            await erc20Contract.connect(accounts[0]).transfer(accounts[3].address, web3.utils.toWei("10000", "ether"))
        })

        it("Setup bot protection contract", async () => {
            // use address is not owner to call function setBotProtectionEnabled()
            await expect(erc20Contract.connect(accounts[1]).setBotProtectionEnabled(true)).to.be.revertedWith('Ownable: caller is not the owner')
            // use address is not owner to call function setBotProtectionEnabled()
            await expect(erc20Contract.connect(accounts[1]).setBotProtectionAddress(botProtectionContract.address)).to.be.revertedWith('Ownable: caller is not the owner')
            // use owner to call function setBotProtectionEnabled() have not setBotProtectionAddress
            await expect(erc20Contract.connect(accounts[0]).setBotProtectionEnabled(true)).to.be.revertedWith('You have to set bot protection address first')
            // use owner to set botProtectionContract address
            let tx = await erc20Contract.connect(accounts[0]).setBotProtectionAddress(botProtectionContract.address);
            tx = await tx.wait()
            let event = tx.events[0].args
            expect(event.botProtectionContract).to.equal(botProtectionContract.address)
            expect(await erc20Contract.botProtectionContract()).to.equal(botProtectionContract.address)
            // use owner to set enable bot
            tx = await erc20Contract.connect(accounts[0]).setBotProtectionEnabled(true);
            tx = await tx.wait()
            event = tx.events[0].args
            expect(event.enabled).to.true
            expect(await erc20Contract.botProtectionEnabled()).to.true
        })

        it("Check bot", async () => {
            // account[1] address[2] is exchange address
            // transfer between 2 address is not exchange address
            let balanceAccount0Before = await erc20Contract.balanceOf(accounts[0].address)
            await erc20Contract.connect(accounts[0]).transfer(accounts[4].address, web3.utils.toWei("5000", "ether"))
            expect(await erc20Contract.balanceOf(accounts[4].address)).to.equal(web3.utils.toWei("5000", "ether"))
            let balanceAccount0After = BigInt(balanceAccount0Before) - BigInt(web3.utils.toWei("5000", "ether"));
            expect(await erc20Contract.balanceOf(accounts[0].address)).to.equal(balanceAccount0After)

            // use exchange address transfer x token (x > 700) to other address (case buy)
            let balanceAccount1Before = await erc20Contract.balanceOf(accounts[1].address)
            let balanceAccount4Before = await erc20Contract.balanceOf(accounts[4].address)
            await erc20Contract.connect(accounts[1]).transfer(accounts[4].address, web3.utils.toWei("600", "ether"))
            balanceAccount1After = BigInt(balanceAccount1Before) - BigInt(web3.utils.toWei("600", "ether"));
            expect(await erc20Contract.balanceOf(accounts[1].address)).to.equal(balanceAccount1After)
            let balanceAccount4After = BigInt(balanceAccount4Before) + BigInt(web3.utils.toWei("600", "ether"));
            expect(await erc20Contract.balanceOf(accounts[4].address)).to.equal(balanceAccount4After)

            // use any address transfer x token (x < 600) to exchange address (case sell)
            balanceAccount0Before = await erc20Contract.balanceOf(accounts[0].address)
            balanceAccount1Before = await erc20Contract.balanceOf(accounts[1].address)
            await erc20Contract.connect(accounts[0]).transfer(accounts[1].address, web3.utils.toWei("500", "ether"))
            balanceAccount0After = BigInt(balanceAccount0Before) - BigInt(web3.utils.toWei("500", "ether"));
            expect(await erc20Contract.balanceOf(accounts[0].address)).to.equal(balanceAccount0After)
            balanceAccount1After = BigInt(balanceAccount1Before) + BigInt(web3.utils.toWei("500", "ether"));
            expect(await erc20Contract.balanceOf(accounts[1].address)).to.equal(balanceAccount1After)

            // use exchange address transfer x token (x > 700) to other address (case buy)
            await expect(erc20Contract.connect(accounts[1]).transfer(accounts[4].address, web3.utils.toWei("1000", "ether"))).to.be.revertedWith('Buyable amount of you exceeded')


            // use any address transfer x token (x > 600) to exchange address (case sell)
            await expect(erc20Contract.connect(accounts[0]).transfer(accounts[1].address, web3.utils.toWei("2000", "ether"))).to.be.revertedWith('Saleable amount of you exceeded')

            // case 2 transaction transfer in same block with total amount < 1200
            let contract = new web3.eth.Contract(ERC20WithBotProtect.abi, erc20Contract.address);
            let batch = new web3.BatchRequest();
            batch.add(
                contract.methods.transfer(
                    accounts[4].address,
                    web3.utils.toWei("600", "ether")
                ).send.request({ from: accs[1] })
            )
            batch.add(
                contract.methods.transfer(
                    accounts[1].address, web3.utils.toWei("500", "ether")
                ).send.request({ from: accs[0] })
            )
            batch.execute()


            // case 2 transaction transfer in same block with total amount > 1200
            batch = new web3.BatchRequest();
            batch.add(
                contract.methods.transfer(
                    accounts[4].address,
                    web3.utils.toWei("700", "ether")
                ).send.request({ from: accs[1] })
            )
            batch.add(
                contract.methods.transfer(
                    accounts[1].address, web3.utils.toWei("600", "ether")
                ).send.request({ from: accs[0] })
            )
            batch.execute()
        })

        it("Turn off bot protect", async () => {
            //disable botprotect
            let tx = await erc20Contract.connect(accounts[0]).setBotProtectionEnabled(false);
            tx = await tx.wait()
            let event = tx.events[0].args
            expect(event.enabled).to.false
            expect(await erc20Contract.botProtectionEnabled()).to.false
            // transfer token

            await erc20Contract.connect(accounts[1]).transfer(accounts[3].address, web3.utils.toWei("5000", "ether"))
        })

        it("Approve", async () => {
            await erc20Contract.connect(accounts[0]).pause();
            await expect(erc20Contract.connect(accounts[0])
                .approve(accounts[1].address, web3.utils.toWei("5000", "ether"))
            ).to.revertedWith("Pausable: paused")

            await expect(erc20Contract.connect(accounts[0])
                .increaseAllowance(accounts[1].address, web3.utils.toWei("5000", "ether"))
            ).to.revertedWith("Pausable: paused")

            await expect(erc20Contract.connect(accounts[0])
                .decreaseAllowance(accounts[1].address, web3.utils.toWei("5000", "ether"))
            ).to.revertedWith("Pausable: paused")

            await erc20Contract.connect(accounts[0]).unpause();
            let tx = await erc20Contract.connect(accounts[0])
                .approve(accounts[1].address, web3.utils.toWei("5000", "ether"))
            tx = await tx.wait()
            expect(tx.events[0].args.value).to.equal(web3.utils.toWei("5000", "ether"))
            expect(await erc20Contract.allowance(accounts[0].address, accounts[1].address)).to.equal(web3.utils.toWei("5000", "ether"))

            tx = await erc20Contract.connect(accounts[0])
                .increaseAllowance(accounts[1].address, web3.utils.toWei("5000", "ether"))
            tx = await tx.wait()
            expect(tx.events[0].args.value).to.equal(web3.utils.toWei("10000", "ether"))
            expect(await erc20Contract.allowance(accounts[0].address, accounts[1].address)).to.equal(web3.utils.toWei("10000", "ether"))

            tx = await erc20Contract.connect(accounts[0])
                .decreaseAllowance(accounts[1].address, web3.utils.toWei("5000", "ether"))
            tx = await tx.wait()
            expect(tx.events[0].args.value).to.equal(web3.utils.toWei("5000", "ether"))
            expect(await erc20Contract.allowance(accounts[0].address, accounts[1].address)).to.equal(web3.utils.toWei("5000", "ether"))
        })

        it("Mint", async () => {
            await expect(erc20Contract.connect(accounts[1]).mint(accounts[1].address, web3.utils.toWei("5000", "ether"))).to.be.revertedWith('Ownable: caller is not the owner')

            let balanceAccount1Before = await erc20Contract.balanceOf(accounts[1].address)
            let tx = await erc20Contract.connect(accounts[0]).mint(accounts[1].address, web3.utils.toWei("5000", "ether"))
            let balanceAccount1After = BigInt(balanceAccount1Before) + BigInt(web3.utils.toWei("5000", "ether"))
            expect(await erc20Contract.balanceOf(accounts[1].address)).to.equal(balanceAccount1After)
            await expect(erc20Contract.connect(accounts[0]).mint(accounts[1].address, web3.utils.toWei("5000", "ether"))).to.be.revertedWith('ERC20Capped: cap exceeded')

        })

        it("Burn", async () => {
            await erc20Contract.connect(accounts[0]).pause();
            await expect(erc20Contract.connect(accounts[0])
                .burn(web3.utils.toWei("5000", "ether"))
            ).to.revertedWith("Pausable: paused")
            await expect(erc20Contract.connect(accounts[1])
                .burnFrom(accounts[0].address, web3.utils.toWei("5000", "ether"))
            ).to.revertedWith("Pausable: paused")

            await erc20Contract.connect(accounts[0]).unpause();
            let balanceAccount0Before = await erc20Contract.balanceOf(accounts[0].address)
            let tx = await erc20Contract.connect(accounts[0])
                .burn(web3.utils.toWei("5000", "ether"))
            tx = await tx.wait()
            expect(tx.events[0].args.value).to.equal(web3.utils.toWei("5000", "ether"))
            let balanceAccount0After = BigInt(balanceAccount0Before) - BigInt(web3.utils.toWei("5000", "ether"))
            expect(await erc20Contract.balanceOf(accounts[0].address)).to.equal(balanceAccount0After)

            balanceAccount0Before = await erc20Contract.balanceOf(accounts[0].address)
            tx = await erc20Contract.connect(accounts[1])
                .burnFrom(accounts[0].address, web3.utils.toWei("5000", "ether"))
            tx = await tx.wait()
            expect(tx.events[1].args.value).to.equal(web3.utils.toWei("5000", "ether"))
            balanceAccount0After = BigInt(balanceAccount0Before) - BigInt(web3.utils.toWei("5000", "ether"))
            expect(await erc20Contract.balanceOf(accounts[0].address)).to.equal(balanceAccount0After)
        })
    })
});