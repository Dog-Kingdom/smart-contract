const { expect } = require("chai");
const { ethers } = require("hardhat");
const DKFactory = "DokoToken";
const KDLFactory = "DKToken";
const DogContractFactory = "DogContract"
const EquipmentContractFactory = "EquipmentContract"
const depositBuildName = "Deposit"
const vaultBuildName = "Vault"
const decimals = 10**18
const cid="QmZECPyLHgRDH89t6ruJj3fngh8bM3XPJVq3D76JFELRA8" 

const sleep = async (time) => {
  setTimeout(() => {}, time)
}

describe("Deposit", function () {
  let _dogContract
  let _equipmentContract
  let _DKTokenContract
  let _KDLTokenContract
  let _vaultContract
  let _depositContract
  let _tokenId
  before(async function () {
    [
      _deployer,
      _owner,
      _user1,
      _user2
    ] = await ethers.getSigners();
    const DKTokenFactory = await ethers.getContractFactory(DKFactory);
    const KDLTokenFactory = await ethers.getContractFactory(KDLFactory);
    const DogFactory = await ethers.getContractFactory(DogContractFactory);
    const EquipmentFactory = await ethers.getContractFactory(EquipmentContractFactory);
    const depositFactory = await ethers.getContractFactory(depositBuildName)
    const vaultFactory = await ethers.getContractFactory(vaultBuildName)

    const KDLTokenContract = await upgrades.deployProxy(KDLTokenFactory, ["DK", "DK", _deployer.address], {kind: "uups"})

    _KDLTokenContract = await KDLTokenContract.deployed();

    const DKTokenContract = await DKTokenFactory.deploy("DOKO", "DK", BigInt(1000 * decimals), _deployer.address);
    _DKTokenContract = await DKTokenContract.deployed();

    const dogContract = await upgrades.deployProxy(DogFactory, ["dog", "d", _deployer.address], { kind: "uups"});
    _dogContract = await dogContract.deployed();

    const equipmentContract = await upgrades.deployProxy(EquipmentFactory, ["equipment", "e", _deployer.address], {kind: "uups"});
    _equipmentContract = await equipmentContract.deployed();

    const vaultContract = await upgrades.deployProxy(vaultFactory, [_deployer.address], {kind: "uups"})
    _vaultContract = await vaultContract.deployed();

    const depositContract = await upgrades.deployProxy(
      depositFactory, 
      [
        _KDLTokenContract.address, 
        _dogContract.address, 
        _equipmentContract.address, 
        _vaultContract.address,
        _deployer.address
      ],
      { kind: "uups"}
    )
    _depositContract = await depositContract.deployed();
  })

  it("should mint dog nft", async () => {
    const transaction = await _dogContract.mint(
      _deployer.address,10,10,10,10,true,cid
    )
    const txData = await transaction.wait()
    const event = txData.events[0].args
    expect(event.tokenId).to.not.NaN
    _tokenId = event.tokenId
  })

  it("should revert with message `Dk token must be smart contract`",async () => {
    await expect(_depositContract.setDKToken(_deployer.address)).to.be.revertedWith("Dk token must be smart contract")
  })

  it("should revert with message `Dog contract must be smart contract`", async() => {
    await expect(_depositContract.setDogContract(_deployer.address)).to.be.revertedWith("Dog contract must be smart contract")
  })

  it("should revert with message `Equipment contract must be smart contract`", async() => {
    await expect(_depositContract.setEquipmentContract(_deployer.address)).to.be.revertedWith("Equipment contract must be smart contract")
  })

  it("should return event setDKToken", async() => {
    const transaction = await _depositContract.setDKToken(_KDLTokenContract.address)
    const txData = await transaction.wait()
    const event = txData.events[0].args
    console.log({event})
  })

  it("should return event setDogContract", async() => {
    const transaction = await _depositContract.setDogContract(_dogContract.address)
    const txData = await transaction.wait()
    const event = txData.events[0].args
    expect(event.dogContract).to.be.equal(_dogContract.address)
  })

  it("should return event setEquipmentContract", async() => {
    const transaction = await _depositContract.setEquipmentContract(_equipmentContract.address)
    const txData = await transaction.wait()
    const event = txData.events[0].args
    expect(event.equipmentContract).to.be.equal(_equipmentContract.address)
  })
  
  
  it("should revert with message `Vault must be smart contract`", async() => {
    await expect(_depositContract.setVault(_deployer.address)).to.be.revertedWith("Vault must be smart contract")
  })

  it("should revert with message `Vault has not set yet`", async () => {
    await expect(_depositContract.depositNFT(
      "asdbasdjh",
      _equipmentContract.address,
      [_tokenId]
    )).to.be.revertedWith("Vault has not set yet")
  })

  it("should revert with message `User ID must not be empty`", async () => {
    await expect(_depositContract.depositNFT(
      "",
      _vaultContract.address,
      [_tokenId]
    )).to.be.revertedWith("User ID must not be empty")
  })

  it("should return event setVault", async() => {
    const transaction = await _depositContract.setVault(_vaultContract.address)
    const txData = await transaction.wait()
    const event = txData.events[0].args
    expect(event.vault).to.be.equal(_vaultContract.address)
  })

  it("should revert with message `NFT contract is invalid`", async () => {
    await expect(_depositContract.depositNFT(
      "asdbasdjh",
      _vaultContract.address,
      [_tokenId]
    )).to.be.revertedWith("NFT contract is invalid")
  })

  it("Should deposit nft and then return event", async function () {
    const approve = await _dogContract.connect(_deployer).approve(_depositContract.address,_tokenId)
    console.log("lock nft success: ", _tokenId)
    const transaction = await _depositContract.depositNFT(
        "asdbasdjh",
        _dogContract.address,
        [_tokenId]
      )
    const txData = await transaction.wait()
    const event = txData.events[0].args
    console.log({event})
  });

  it("should revert with message `Token contract is invalid`", async () => {
    const approve = await _KDLTokenContract.connect(_deployer).approve(_depositContract.address,BigInt(10*decimals))
    await expect(_depositContract.depositToken(
      "asdbasdjh",
      _vaultContract.address,
      10
    )).to.be.revertedWith("Token contract is invalid")
  })
  
  it("Should deposit token and then return event", async function () {
    const balance = await _KDLTokenContract.balanceOf(_deployer.address)
    console.log({balance})
    const transaction = await _depositContract.connect(_deployer).depositToken(
        "asdbasdjh",
        _KDLTokenContract.address,
        BigInt(10*decimals)
      )
    const txData = await transaction.wait()
    const event = txData.events[0].args
    console.log({event})
  });
  it("should withdraw box nft and then return event", async function () {
    const transaction = await _depositContract.withdrawNFT()
  })
});
