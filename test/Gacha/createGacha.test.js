const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const DKFactory = "DokoToken";
const KDLFactory = "DKToken";
const BoxContractFactory = "BoxContract"
const DogContractFactory = "DogContract"
const EquipmentContractFactory = "EquipmentContract"
const GachaContractFactory = "Gacha"
const decimals = 10**18
const cid = "QmZECPyLHgRDH89t6ruJj3fngh8bM3XPJVq3D76JFELRA8"

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

describe("Gacha", function () {
  let _boxContract
  let _dogContract
  let _equipmentContract
  let _gachaContract
  let _DKTokenContract
  let _KDLTokenContract
  let gachaEvent = {}
  let boxData = {}
  
  before("deploy contract", async function () {
    [
      _deployer,
      _owner,
      _user1,
      _user2
    ] = await ethers.getSigners();
    

    const DKTokenFactory = await ethers.getContractFactory(DKFactory);
    const KDLTokenFactory = await ethers.getContractFactory(KDLFactory);
    const BoxFactory = await ethers.getContractFactory(BoxContractFactory);
    const DogFactory = await ethers.getContractFactory(DogContractFactory);
    const EquipmentFactory = await ethers.getContractFactory(EquipmentContractFactory);
    const gachaFactory = await ethers.getContractFactory(GachaContractFactory);

    const KDLTokenContract = await upgrades.deployProxy(KDLTokenFactory, ["KDL", "KDL", _owner.address], {kind: "uups"})

    _KDLTokenContract = await KDLTokenContract.deployed();

    const DKTokenContract = await DKTokenFactory.deploy("DOKO", "DK", BigInt(1000 * decimals), _owner.address);
    _DKTokenContract = await DKTokenContract.deployed();

    const boxContract = await upgrades.deployProxy(BoxFactory, ["box","b", _owner.address], { kind: "uups" });
    _boxContract = await boxContract.deployed();

    const dogContract = await upgrades.deployProxy(DogFactory, ["dog", "d", _owner.address], { kind: "uups"});
    _dogContract = await dogContract.deployed();

    const equipmentContract = await upgrades.deployProxy(EquipmentFactory, ["equipment", "e", _owner.address], {kind: "uups"});
    _equipmentContract = await equipmentContract.deployed();

    const gachaContract = await upgrades.deployProxy(gachaFactory, [_owner.address, _boxContract.address], { kind: "uups"});
    _gachaContract = await gachaContract.deployed();

  })

  it("should set admin role to user1", async () => {
    const transaction = await _gachaContract.setAdmin(_user1.address, true);
    const txData = await transaction.wait();
    const event = txData.events[0].args;
    expect(event.admin).to.be.equal(_user1.address);
    expect(event.isAdmin).to.be.equal(true);
  })

  it("should set operator role to user1", async () => {
    const setOperatorTrans = await _gachaContract.connect(_deployer).setOperator(_user1.address, true);
    const txDataOperator = await setOperatorTrans.wait();
    const event = txDataOperator.events[0].args;
    
    expect(event.operator).to.be.equal(_user1.address);
    expect(event.isOperator).to.be.equal(true);
  })

  it("should save box contract address in gacha contract", async function () {
    const transaction = await _gachaContract.connect(_deployer).setBoxContract(_boxContract.address);
    const txData = await transaction.wait();
    console.log("==========================================================================")
    console.log("txData: ", txData);
    console.log("==========================================================================")
    const event = txData.events[0].args;
    expect(event.boxContract).to.be.equal(_boxContract.address)
  })

  it("should save dog contract address in gacha contract", async () => {
    const transaction = await _gachaContract.connect(_deployer).setDogContract(_dogContract.address);
    const txData = await transaction.wait();
    const event = txData.events[0].args;
    expect(event.dogContract).to.be.equal(_dogContract.address);
  })

  it("should save equipment contract address in gacha contract", async () => {
    const transaction = await _gachaContract.connect(_deployer).setEquipmentContract(_equipmentContract.address);
    const txData = await transaction.wait();
    const event = txData.events[0].args;
    expect(event.equipmentContract).to.be.equal(_equipmentContract.address);
  })

  it("should set DKToken address into whitelist", async () => {
    const transaction = await _gachaContract.connect(_deployer).setWhitelistCurrency(_DKTokenContract.address, true);
    const txData = await transaction.wait();
    const event = txData.events[0].args;
    console.log("event: ", event.isWhitelist)
    expect(event.tokenCurrency).to.be.equal(_DKTokenContract.address);
    expect(event.isWhitelist).to.be.equal(true);
  })

  it("should revert with message 'Name must not be empty'", async () => {
    let paramCreateEvent = {
      nameEvent: "",
      startTime: parseInt(Date.now()/1000),
      endTime: parseInt(Date.now()/1000 + 108000),
      totalTypeBox: 7,
      totalChildBoxes: 4,
      totalBox: 11,
      childBoxesByType: [2,1,1,0,0]
    }
    let LUCKY_BOX = 
    {
        typeBox: 6,
        boxesByType: 10,
        totalBoxesByRarity: ["1", "1", "1", "1", "1", "1", "1", "1", "1", "1"],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("100", "ether"),
        amounts: [1,1]
    }
    let EPIC_DOG_BOX = 
    {
        typeBox: 0,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("200", "ether"),
        amounts: [0,0]
    }
    let EPIC_EQUIPMENT_BOX = 
    {
        typeBox: 2,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("300", "ether"),
        amounts: [0,0]
    }
    let PREMIUM_DOG_BOX = 
    {
        typeBox: 1,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let PREMIUM_EQUIPMENT_BOX = 
    {
        typeBox: 3,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let GRAND_BOX = 
    {
        typeBox: 4,
        boxesByType: 1,
        totalBoxesByRarity: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 4,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let META_BOX = 
    {
        typeBox: 5,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    await expect(_gachaContract.connect(_user1).createGachaEvent(
      paramCreateEvent.nameEvent,
      paramCreateEvent.startTime,
      paramCreateEvent.endTime,
      paramCreateEvent.totalTypeBox,
      paramCreateEvent.totalBox,
      paramCreateEvent.totalChildBoxes,
      paramCreateEvent.childBoxesByType,
      [LUCKY_BOX, EPIC_DOG_BOX, EPIC_EQUIPMENT_BOX, PREMIUM_DOG_BOX, PREMIUM_EQUIPMENT_BOX, GRAND_BOX, META_BOX]
    )).to.be.revertedWith("Name must not be empty")
  })

  
  it("should revert with message 'Start time >= end time'", async () => {
    let paramCreateEvent = {
      nameEvent: "duc test",
      startTime: parseInt(Date.now()/1000 + 1),
      endTime: parseInt(Date.now()/1000),
      totalTypeBox: 7,
      totalChildBoxes: 4,
      totalBox: 11,
      childBoxesByType: [2,1,1,0,0]
    }
    let LUCKY_BOX = 
    {
        typeBox: 6,
        boxesByType: 10,
        totalBoxesByRarity: ["1", "1", "1", "1", "1", "1", "1", "1", "1", "1"],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("100", "ether"),
        amounts: [1,1]
    }
    let EPIC_DOG_BOX = 
    {
        typeBox: 0,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("200", "ether"),
        amounts: [1,1]
    }
    let EPIC_EQUIPMENT_BOX = 
    {
        typeBox: 2,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("300", "ether"),
        amounts: [1,1]
    }
    let PREMIUM_DOG_BOX = 
    {
        typeBox: 1,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [1,1]
    }
    let PREMIUM_EQUIPMENT_BOX = 
    {
        typeBox: 3,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [1,1]
    }
    let GRAND_BOX = 
    {
        typeBox: 4,
        boxesByType: 1,
        totalBoxesByRarity: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 4,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [1,1]
    }
    let META_BOX = 
    {
        typeBox: 5,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [1,1]
    }

    await expect(_gachaContract.connect(_user1).createGachaEvent(
      paramCreateEvent.nameEvent,
      paramCreateEvent.startTime,
      paramCreateEvent.endTime,
      paramCreateEvent.totalTypeBox,
      paramCreateEvent.totalBox,
      paramCreateEvent.totalChildBoxes,
      paramCreateEvent.childBoxesByType,
      [LUCKY_BOX, EPIC_DOG_BOX, EPIC_EQUIPMENT_BOX, PREMIUM_DOG_BOX, PREMIUM_EQUIPMENT_BOX, GRAND_BOX, META_BOX]
    )).to.be.revertedWith("Start time >= end time")
  })


  it("should revert with message 'Total boxes == 0'", async () => {
    let paramCreateEvent = {
      nameEvent: "duc test",
      startTime: parseInt(Date.now()/1000),
      endTime: parseInt(Date.now()/1000 + 108000),
      totalTypeBox: 7,
      totalChildBoxes: 4,
      totalBox: 0,
      childBoxesByType: [2,1,1,0,0]
    }
    let LUCKY_BOX = 
    {
        typeBox: 6,
        boxesByType: 10,
        totalBoxesByRarity: ["1", "1", "1", "1", "1", "1", "1", "1", "1", "1"],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("100", "ether"),
        amounts: [1,1]
    }
    let EPIC_DOG_BOX = 
    {
        typeBox: 0,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("200", "ether"),
        amounts: [1,1]
    }
    let EPIC_EQUIPMENT_BOX = 
    {
        typeBox: 2,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("300", "ether"),
        amounts: [1,1]
    }
    let PREMIUM_DOG_BOX = 
    {
        typeBox: 1,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [1,1]
    }
    let PREMIUM_EQUIPMENT_BOX = 
    {
        typeBox: 3,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [1,1]
    }
    let GRAND_BOX = 
    {
        typeBox: 4,
        boxesByType: 1,
        totalBoxesByRarity: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 4,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [1,1]
    }
    let META_BOX = 
    {
        typeBox: 5,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [1,1]
    }

    await expect(_gachaContract.connect(_user1).createGachaEvent(
      paramCreateEvent.nameEvent,
      paramCreateEvent.startTime,
      paramCreateEvent.endTime,
      paramCreateEvent.totalTypeBox,
      paramCreateEvent.totalBox,
      paramCreateEvent.totalChildBoxes,
      paramCreateEvent.childBoxesByType,
      [LUCKY_BOX, EPIC_DOG_BOX, EPIC_EQUIPMENT_BOX, PREMIUM_DOG_BOX, PREMIUM_EQUIPMENT_BOX, GRAND_BOX, META_BOX]
    )).to.be.revertedWith("Total boxes == 0")
  })


  it("should revert with message 'Total type box == 0'", async () => {
    let paramCreateEvent = {
      nameEvent: "duc test",
      startTime: parseInt(Date.now()/1000),
      endTime: parseInt(Date.now()/1000 + 108000),
      totalTypeBox: 0,
      totalChildBoxes: 4,
      totalBox: 11,
      childBoxesByType: [2,1,1,0,0]
    }
    let LUCKY_BOX = 
    {
        typeBox: 6,
        boxesByType: 10,
        totalBoxesByRarity: ["1", "1", "1", "1", "1", "1", "1", "1", "1", "1"],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("100", "ether"),
        amounts: [1,1]
    }
    let EPIC_DOG_BOX = 
    {
        typeBox: 0,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("200", "ether"),
        amounts: [0,0]
    }
    let EPIC_EQUIPMENT_BOX = 
    {
        typeBox: 2,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("300", "ether"),
        amounts: [0,0]
    }
    let PREMIUM_DOG_BOX = 
    {
        typeBox: 1,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let PREMIUM_EQUIPMENT_BOX = 
    {
        typeBox: 3,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let GRAND_BOX = 
    {
        typeBox: 4,
        boxesByType: 1,
        totalBoxesByRarity: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 4,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let META_BOX = 
    {
        typeBox: 5,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    await expect(_gachaContract.connect(_user1).createGachaEvent(
      paramCreateEvent.nameEvent,
      paramCreateEvent.startTime,
      paramCreateEvent.endTime,
      paramCreateEvent.totalTypeBox,
      paramCreateEvent.totalBox,
      paramCreateEvent.totalChildBoxes,
      paramCreateEvent.childBoxesByType,
      [LUCKY_BOX, EPIC_DOG_BOX, EPIC_EQUIPMENT_BOX, PREMIUM_DOG_BOX, PREMIUM_EQUIPMENT_BOX, GRAND_BOX, META_BOX]
    )).to.be.revertedWith("Total type box == 0")
  })


  it("should revert with message 'Box data lists != total type box'", async () => {
    let paramCreateEvent = {
      nameEvent: "duc test",
      startTime: parseInt(Date.now()/1000),
      endTime: parseInt(Date.now()/1000 + 108000),
      totalTypeBox: 7,
      totalChildBoxes: 4,
      totalBox: 11,
      childBoxesByType: [2,1,1,0,0]
    }
    let LUCKY_BOX = 
    {
        typeBox: 6,
        boxesByType: 10,
        totalBoxesByRarity: ["1", "1", "1", "1", "1", "1", "1", "1", "1", "1"],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("100", "ether"),
        amounts: [1,1]
    }
    let EPIC_DOG_BOX = 
    {
        typeBox: 0,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("200", "ether"),
        amounts: [0,0]
    }
    let EPIC_EQUIPMENT_BOX = 
    {
        typeBox: 2,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("300", "ether"),
        amounts: [0,0]
    }
    let PREMIUM_DOG_BOX = 
    {
        typeBox: 1,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let PREMIUM_EQUIPMENT_BOX = 
    {
        typeBox: 3,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let GRAND_BOX = 
    {
        typeBox: 4,
        boxesByType: 1,
        totalBoxesByRarity: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 4,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let META_BOX = 
    {
        typeBox: 5,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    await expect(_gachaContract.connect(_user1).createGachaEvent(
      paramCreateEvent.nameEvent,
      paramCreateEvent.startTime,
      paramCreateEvent.endTime,
      paramCreateEvent.totalTypeBox,
      paramCreateEvent.totalBox,
      paramCreateEvent.totalChildBoxes,
      paramCreateEvent.childBoxesByType,
      [LUCKY_BOX, EPIC_DOG_BOX, EPIC_EQUIPMENT_BOX, PREMIUM_DOG_BOX, PREMIUM_EQUIPMENT_BOX, GRAND_BOX]
    )).to.be.revertedWith("Box data lists != total type box")
  })

  it("it should return event of gacha event", async function () {
    let paramCreateEvent = {
      nameEvent: "duc test",
      startTime: parseInt(Date.now()/1000),
      endTime: parseInt(Date.now()/1000 + 108000),
      totalTypeBox: 7,
      totalChildBoxes: 4,
      totalBox: 11,
      childBoxesByType: [2,1,1,0,0]
    }
    let LUCKY_BOX = 
    {
        typeBox: 6,
        boxesByType: 10,
        totalBoxesByRarity: ["1", "1", "1", "1", "1", "1", "1", "1", "1", "1"],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("100", "ether"),
        amounts: [1,1]
    }
    let EPIC_DOG_BOX = 
    {
        typeBox: 0,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("200", "ether"),
        amounts: [0,0]
    }
    let EPIC_EQUIPMENT_BOX = 
    {
        typeBox: 2,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("300", "ether"),
        amounts: [0,0]
    }
    let PREMIUM_DOG_BOX = 
    {
        typeBox: 1,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let PREMIUM_EQUIPMENT_BOX = 
    {
        typeBox: 3,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let GRAND_BOX = 
    {
        typeBox: 4,
        boxesByType: 1,
        totalBoxesByRarity: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 4,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let META_BOX = 
    {
        typeBox: 5,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    const transaction = await _gachaContract.connect(_user1).createGachaEvent(
      paramCreateEvent.nameEvent,
      paramCreateEvent.startTime,
      paramCreateEvent.endTime,
      paramCreateEvent.totalTypeBox,
      paramCreateEvent.totalBox,
      paramCreateEvent.totalChildBoxes,
      paramCreateEvent.childBoxesByType,
      [LUCKY_BOX, EPIC_DOG_BOX, EPIC_EQUIPMENT_BOX, PREMIUM_DOG_BOX, PREMIUM_EQUIPMENT_BOX, GRAND_BOX, META_BOX]
    )
    const txData = await transaction.wait()
    let event = txData.events[0].args
    gachaEvent.eventId = event.eventId;
    expect(event.eventId).to.exist;
  });

  it("should revert with message 'Total boxes by rarity list must have ten elements'", async() => {
    let paramCreateEvent = {
      nameEvent: "duc test",
      startTime: parseInt(Date.now()/1000),
      endTime: parseInt(Date.now()/1000 + 108000),
      totalTypeBox: 7,
      totalChildBoxes: 4,
      totalBox: 11,
      childBoxesByType: [2,1,1,0,0]
    }
    let LUCKY_BOX = 
    {
        typeBox: 6,
        boxesByType: 10,
        totalBoxesByRarity: ["1", "1", "1", "1", "1", "1", "1", "1", "1"],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("100", "ether"),
        amounts: [1,1]
    }
    let EPIC_DOG_BOX = 
    {
        typeBox: 0,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("200", "ether"),
        amounts: [0,0]
    }
    let EPIC_EQUIPMENT_BOX = 
    {
        typeBox: 2,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("300", "ether"),
        amounts: [0,0]
    }
    let PREMIUM_DOG_BOX = 
    {
        typeBox: 1,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let PREMIUM_EQUIPMENT_BOX = 
    {
        typeBox: 3,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let GRAND_BOX = 
    {
        typeBox: 4,
        boxesByType: 1,
        totalBoxesByRarity: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 4,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let META_BOX = 
    {
        typeBox: 5,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    await expect(_gachaContract.connect(_user1).createGachaEvent(
      paramCreateEvent.nameEvent,
      paramCreateEvent.startTime,
      paramCreateEvent.endTime,
      paramCreateEvent.totalTypeBox,
      paramCreateEvent.totalBox,
      paramCreateEvent.totalChildBoxes,
      paramCreateEvent.childBoxesByType,
      [LUCKY_BOX, EPIC_DOG_BOX, EPIC_EQUIPMENT_BOX, PREMIUM_DOG_BOX, PREMIUM_EQUIPMENT_BOX, GRAND_BOX, META_BOX]
    )).to.be.revertedWith("DK33")
  })

  it("should revert with message 'Token currency is not whitelist'", async() => {
    let paramCreateEvent = {
      nameEvent: "duc test",
      startTime: parseInt(Date.now()/1000),
      endTime: parseInt(Date.now()/1000 + 108000),
      totalTypeBox: 7,
      totalChildBoxes: 4,
      totalBox: 11,
      childBoxesByType: [2,1,1,0,0]
    }
    let LUCKY_BOX = 
    {
        typeBox: 6,
        boxesByType: 10,
        totalBoxesByRarity: ["1", "1", "1", "1", "1", "1", "1", "1", "1", "1"],
        totalChildBoxesByType: 0,
        tokenCurrency: _KDLTokenContract.address,
        price: web3.utils.toWei("100", "ether"),
        amounts: [1,1]
    }
    let EPIC_DOG_BOX = 
    {
        typeBox: 0,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _KDLTokenContract.address,
        price: web3.utils.toWei("200", "ether"),
        amounts: [0,0]
    }
    let EPIC_EQUIPMENT_BOX = 
    {
        typeBox: 2,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _KDLTokenContract.address,
        price: web3.utils.toWei("300", "ether"),
        amounts: [0,0]
    }
    let PREMIUM_DOG_BOX = 
    {
        typeBox: 1,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let PREMIUM_EQUIPMENT_BOX = 
    {
        typeBox: 3,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _KDLTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let GRAND_BOX = 
    {
        typeBox: 4,
        boxesByType: 1,
        totalBoxesByRarity: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 4,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let META_BOX = 
    {
        typeBox: 5,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _KDLTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    await expect(_gachaContract.connect(_user1).createGachaEvent(
      paramCreateEvent.nameEvent,
      paramCreateEvent.startTime,
      paramCreateEvent.endTime,
      paramCreateEvent.totalTypeBox,
      paramCreateEvent.totalBox,
      paramCreateEvent.totalChildBoxes,
      paramCreateEvent.childBoxesByType,
      [LUCKY_BOX, EPIC_DOG_BOX, EPIC_EQUIPMENT_BOX, PREMIUM_DOG_BOX, PREMIUM_EQUIPMENT_BOX, GRAND_BOX, META_BOX]
    )).to.be.revertedWith("DK15")
  })

  it("should revert with message 'total child boxes must greater than 0'", async() => {
    let paramCreateEvent = {
      nameEvent: "duc test",
      startTime: parseInt(Date.now()/1000),
      endTime: parseInt(Date.now()/1000 + 108000),
      totalTypeBox: 7,
      totalChildBoxes: 4,
      totalBox: 11,
      childBoxesByType: [2,1,1,0,0]
    }
    let LUCKY_BOX = 
    {
        typeBox: 6,
        boxesByType: 10,
        totalBoxesByRarity: ["1", "1", "1", "1", "1", "1", "1", "1", "1", "1"],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("100", "ether"),
        amounts: [1,1]
    }
    let EPIC_DOG_BOX = 
    {
        typeBox: 0,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("200", "ether"),
        amounts: [0,0]
    }
    let EPIC_EQUIPMENT_BOX = 
    {
        typeBox: 2,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("300", "ether"),
        amounts: [0,0]
    }
    let PREMIUM_DOG_BOX = 
    {
        typeBox: 1,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let PREMIUM_EQUIPMENT_BOX = 
    {
        typeBox: 3,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let GRAND_BOX = 
    {
        typeBox: 4,
        boxesByType: 1,
        totalBoxesByRarity: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let META_BOX = 
    {
        typeBox: 5,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    await expect(_gachaContract.connect(_user1).createGachaEvent(
      paramCreateEvent.nameEvent,
      paramCreateEvent.startTime,
      paramCreateEvent.endTime,
      paramCreateEvent.totalTypeBox,
      paramCreateEvent.totalBox,
      paramCreateEvent.totalChildBoxes,
      paramCreateEvent.childBoxesByType,
      [LUCKY_BOX, EPIC_DOG_BOX, EPIC_EQUIPMENT_BOX, PREMIUM_DOG_BOX, PREMIUM_EQUIPMENT_BOX, GRAND_BOX, META_BOX]
    )).to.be.revertedWith("DK36")
  })
  it("should revert with message 'Total boxes by rarity must be equal boxes by type'", async () => {
    let paramCreateEvent = {
      nameEvent: "duc test",
      startTime: parseInt(Date.now()/1000),
      endTime: parseInt(Date.now()/1000 + 108000),
      totalTypeBox: 7,
      totalChildBoxes: 4,
      totalBox: 11,
      childBoxesByType: [2,1,1,0,0]
    }
    let LUCKY_BOX = 
    {
        typeBox: 6,
        boxesByType: 10,
        totalBoxesByRarity: ["1", "1", "1", "1", "1", "1", "1", "1", "1", "2"],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("100", "ether"),
        amounts: [1,1]
    }
    let EPIC_DOG_BOX = 
    {
        typeBox: 0,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("200", "ether"),
        amounts: [0,0]
    }
    let EPIC_EQUIPMENT_BOX = 
    {
        typeBox: 2,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("300", "ether"),
        amounts: [0,0]
    }
    let PREMIUM_DOG_BOX = 
    {
        typeBox: 1,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let PREMIUM_EQUIPMENT_BOX = 
    {
        typeBox: 3,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let GRAND_BOX = 
    {
        typeBox: 4,
        boxesByType: 1,
        totalBoxesByRarity: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 4,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let META_BOX = 
    {
        typeBox: 5,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    await expect(_gachaContract.connect(_user1).createGachaEvent(
      paramCreateEvent.nameEvent,
      paramCreateEvent.startTime,
      paramCreateEvent.endTime,
      paramCreateEvent.totalTypeBox,
      paramCreateEvent.totalBox,
      paramCreateEvent.totalChildBoxes,
      paramCreateEvent.childBoxesByType,
      [LUCKY_BOX, EPIC_DOG_BOX, EPIC_EQUIPMENT_BOX, PREMIUM_DOG_BOX, PREMIUM_EQUIPMENT_BOX, GRAND_BOX, META_BOX]
    )).to.be.revertedWith("DK35")
  })
  it("should revert with message 'Box price must be greater than zero'", async () => {
    let paramCreateEvent = {
      nameEvent: "duc test",
      startTime: parseInt(Date.now()/1000),
      endTime: parseInt(Date.now()/1000 + 108000),
      totalTypeBox: 7,
      totalChildBoxes: 4,
      totalBox: 11,
      childBoxesByType: [2,1,1,0,0]
    }
    let LUCKY_BOX = 
    {
        typeBox: 6,
        boxesByType: 10,
        totalBoxesByRarity: ["1", "1", "1", "1", "1", "1", "1", "1", "1", "1"],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: 0,
        amounts: [0,0]
    }
    let EPIC_DOG_BOX = 
    {
        typeBox: 0,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("200", "ether"),
        amounts: [0,0]
    }
    let EPIC_EQUIPMENT_BOX = 
    {
        typeBox: 2,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("300", "ether"),
        amounts: [0,0]
    }
    let PREMIUM_DOG_BOX = 
    {
        typeBox: 1,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let PREMIUM_EQUIPMENT_BOX = 
    {
        typeBox: 3,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let GRAND_BOX = 
    {
        typeBox: 4,
        boxesByType: 1,
        totalBoxesByRarity: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let META_BOX = 
    {
        typeBox: 5,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    await expect(_gachaContract.connect(_user1).createGachaEvent(
      paramCreateEvent.nameEvent,
      paramCreateEvent.startTime,
      paramCreateEvent.endTime,
      paramCreateEvent.totalTypeBox,
      paramCreateEvent.totalBox,
      paramCreateEvent.totalChildBoxes,
      paramCreateEvent.childBoxesByType,
      [LUCKY_BOX, EPIC_DOG_BOX, EPIC_EQUIPMENT_BOX, PREMIUM_DOG_BOX, PREMIUM_EQUIPMENT_BOX, GRAND_BOX, META_BOX]
    )).to.be.revertedWith("DK38")
  })
  it("should revert with message 'Total boxes by type must be equal total boxes'", async () => {
    let paramCreateEvent = {
      nameEvent: "duc test",
      startTime: parseInt(Date.now()/1000),
      endTime: parseInt(Date.now()/1000 + 108000),
      totalTypeBox: 7,
      totalChildBoxes: 4,
      totalBox: 11,
      childBoxesByType: [2,1,1,0,0]
    }
    let LUCKY_BOX = 
    {
        typeBox: 6,
        boxesByType: 9,
        totalBoxesByRarity: ["1", "1", "1", "1", "1", "1", "1", "1", "1", "0"],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("100", "ether"),
        amounts: [0,0]
    }
    let EPIC_DOG_BOX = 
    {
        typeBox: 0,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("200", "ether"),
        amounts: [0,0]
    }
    let EPIC_EQUIPMENT_BOX = 
    {
        typeBox: 2,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("300", "ether"),
        amounts: [0,0]
    }
    let PREMIUM_DOG_BOX = 
    {
        typeBox: 1,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let PREMIUM_EQUIPMENT_BOX = 
    {
        typeBox: 3,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let GRAND_BOX = 
    {
        typeBox: 4,
        boxesByType: 1,
        totalBoxesByRarity: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 4,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    let META_BOX = 
    {
        typeBox: 5,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts: [0,0]
    }
    await expect(_gachaContract.connect(_user1).createGachaEvent(
      paramCreateEvent.nameEvent,
      paramCreateEvent.startTime,
      paramCreateEvent.endTime,
      paramCreateEvent.totalTypeBox,
      paramCreateEvent.totalBox,
      paramCreateEvent.totalChildBoxes,
      paramCreateEvent.childBoxesByType,
      [LUCKY_BOX, EPIC_DOG_BOX, EPIC_EQUIPMENT_BOX, PREMIUM_DOG_BOX, PREMIUM_EQUIPMENT_BOX, GRAND_BOX, META_BOX]
    )).to.be.revertedWith("DK40")
  })
});