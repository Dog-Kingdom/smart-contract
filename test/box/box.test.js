const { expect } = require("chai");
const { ethers } = require("hardhat");
const DKFactory = "DokoToken";
const KDLFactory = "DKToken";
const BoxContractFactory = "BoxContract"
const EquipmentContractFactory = "EquipmentContract"
const depositBuildName = "Deposit"
const vaultBuildName = "Vault"
const decimals = 10**18
const cid="QmZECPyLHgRDH89t6ruJj3fngh8bM3XPJVq3D76JFELRA8" 

const sleep = async (time) => {
  setTimeout(() => {}, time)
}

const generateBoxHashData = (typeBox, hashData) => {
  return hre.ethers.utils.solidityKeccak256(["uint256", "bytes32"], [typeBox, hashData])
}

const generateDogHashData = (strength, speed, stamina, weight) => {
  return hre.ethers.utils.solidityKeccak256(["uint256", "uint256", "uint256", "uint256"], [strength, speed, stamina, weight])
}

describe("Deposit", function () {
  let _boxContract
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
    const BoxFactory = await ethers.getContractFactory(BoxContractFactory);

    const BoxContract = await upgrades.deployProxy(BoxFactory, ["box", "b", _deployer.address], { kind: "uups"});
    _boxContract = await BoxContract.deployed();
  })

  it("should mint nft", async () => {
    const setOperator = await _boxContract.setOperator(_deployer.address, true)
    await setOperator.wait()
    const dogHash = generateDogHashData(10,10,10,10)
    const transaction = await _boxContract.connect(_deployer).mint(
      _owner.address,
      0,
      dogHash,
      cid
    )
    const txData = await transaction.wait()
    const event = txData.events[0].args
    _tokenId = event.tokenId
  })
  it("should transfer nft", async () => {
    const transaction = await _boxContract.connect(_owner).transferFrom(_owner.address, _user1.address, _tokenId)
    const txData = await transaction.wait()
    const event = txData.events[0].args
    console.log({event})
  })
});
