const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const BN = require('bn.js');
const { NomicLabsHardhatPluginError } = require("hardhat/plugins");
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

const generateBoxHashData = (typeBox, hashData) => {
  return hre.ethers.utils.solidityKeccak256(["uint256", "bytes32"], [typeBox, hashData])
}

const generateSpecialBox = (typeBox, hashData) => {
  return hre.ethers.utils.solidityKeccak256(["uint256", "bytes32"], [typeBox, hashData])
}

const generateDogHashData = (strength, speed, stamina, weight) => {
  return hre.ethers.utils.solidityKeccak256(["uint256", "uint256", "uint256", "uint256"], [strength, speed, stamina, weight])
}
const generateEquipmentHashData = (speed, stamina, strength, cid) => {
  return hre.ethers.utils.solidityKeccak256(["uint256", "uint256", "uint256"], [speed, stamina, strength])
}

const generateTokenHashData = (tokenCurrency, amount) => {
  return hre.ethers.utils.solidityKeccak256(["address", "uint256"], [tokenCurrency, amount])
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
  let normalBoxId
  let specialBoxId
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

    const KDLTokenContract = await upgrades.deployProxy(KDLTokenFactory, ["DK", "DK", _owner.address], {kind: "uups"})

    _KDLTokenContract = await KDLTokenContract.deployed();

    const DKTokenContract = await DKTokenFactory.deploy("DOKO", "DOKO", BigInt(10000 * decimals), _owner.address);
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

  it("it should return event of gacha event", async function () {
    let paramCreateEvent = {
      nameEvent: "duc test",
      startTime: parseInt(Date.now()/1000),
      endTime: parseInt(Date.now()/1000 + 108000),
      totalTypeBox: 7,
      totalChildBoxes: 4,
      totalBox: 14,
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
        amounts:[1,1]
    }
    let EPIC_DOG_BOX = 
    {
        typeBox: 0,
        boxesByType: 2,
        totalBoxesByRarity: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("200", "ether"),
        amounts:[0,0]
    }
    let EPIC_EQUIPMENT_BOX = 
    {
        typeBox: 2,
        boxesByType: 1,
        totalBoxesByRarity: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("300", "ether"),
        amounts:[0,0]
    }
    let PREMIUM_DOG_BOX = 
    {
        typeBox: 1,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts:[0,0]
    }
    let PREMIUM_EQUIPMENT_BOX = 
    {
        typeBox: 3,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts:[0,0]
    }
    let GRAND_BOX = 
    {
        typeBox: 4,
        boxesByType: 1,
        totalBoxesByRarity: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 4,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts:[0,0]
    }
    let META_BOX = 
    {
        typeBox: 5,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts:[0,0]
    }
    console.log("1")
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

  it("should edit gacha information", async () => {

    let paramCreateEvent = {
      nameEvent: "duc test edit",
      startTime: parseInt(Date.now()/1000),
      endTime: parseInt(Date.now()/1000 + 108000),
      totalTypeBox: 7,
      totalChildBoxes: 4,
      totalBox: 14,
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
        amounts:[1,1]
    }
    let EPIC_DOG_BOX = 
    {
        typeBox: 0,
        boxesByType: 2,
        totalBoxesByRarity: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("200", "ether"),
        amounts:[0,0]
    }
    let EPIC_EQUIPMENT_BOX = 
    {
        typeBox: 2,
        boxesByType: 1,
        totalBoxesByRarity: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("300", "ether"),
        amounts:[0,0]
    }
    let PREMIUM_DOG_BOX = 
    {
        typeBox: 1,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts:[0,0]
    }
    let PREMIUM_EQUIPMENT_BOX = 
    {
        typeBox: 3,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts:[0,0]
    }
    let GRAND_BOX = 
    {
        typeBox: 4,
        boxesByType: 1,
        totalBoxesByRarity: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 4,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts:[0,0]
    }
    let META_BOX = 
    {
        typeBox: 5,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts:[0,0]
    }

    const transaction = await _gachaContract.connect(_user1).editGachaEvent(
      gachaEvent.eventId,
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
    const event = txData.events[0].args
    console.log(event)
    expect(event.eventId).to.be.equal(gachaEvent.eventId)
  })

  it("should add boxData case normal", async function () {
    const _EquipmentHashDatas = []
    const _DogHashDatas = []
    const _TokenHashDatas = []
    for (let i = 0; i < 5; i++) {
      const _DogHashData = generateDogHashData(10, 10, 10 ,10)
      _DogHashDatas.push(_DogHashData)
    }
    
    for (let i = 0; i < 3; i++) {
      const _EquipmentHashData = generateEquipmentHashData(10, 10, 10)
      _EquipmentHashDatas.push(_EquipmentHashData)
    }
    for (let i = 0; i < 1; i++) {
      const _generateTokenHashData = generateTokenHashData(_DKTokenContract.address, BigInt(10*decimals))
      _TokenHashDatas.push(_generateTokenHashData)
    }

    const transaction = 
      await _gachaContract.connect(_user1).addBoxData(
        gachaEvent.eventId, 
        6,
        [..._DogHashDatas, ..._EquipmentHashDatas, ..._TokenHashDatas], 
        [1,2,3,4,5,6,7,8,9]
      )
    
    const txData = await transaction.wait()
    const event = txData.events[0].args
  });

  it("should add boxData case special", async function () {
    const _EquipmentHashDatas = []
    const _DogHashDatas = []
    const _TokenHashDatas = []
    const _BoxHashDatas = []
    for (let i = 0; i < 4; i++) {
      const _DogHashData = generateDogHashData(10, 10, 10 ,10)
      _DogHashDatas.push(_DogHashData)
    }
    console.log(2)
    for (let i = 0; i < 4; i++) {
      const _EquipmentHashData = generateEquipmentHashData(10, 10, 10)
      _EquipmentHashDatas.push(_EquipmentHashData)
    }
    console.log(3)
    for (let i = 0; i < 2; i++) {
      const _generateTokenHashData = generateTokenHashData(_DKTokenContract.address, BigInt(10*decimals))
      _TokenHashDatas.push(_generateTokenHashData)
    }

    for (let i = 0; i < 2; i++) {
      const _childBoxHashData = generateBoxHashData(0, _DogHashDatas[i])
      _BoxHashDatas.push(_childBoxHashData)
    }
    const _childBoxHashData2 = generateBoxHashData(2, _EquipmentHashDatas[0])
    const _childBoxHashData3 = generateBoxHashData(6, _EquipmentHashDatas[1])
    _BoxHashDatas.push(_childBoxHashData2)
    _BoxHashDatas.push(_childBoxHashData3)
    const concatValue = _BoxHashDatas.join(',')
    const hashChildBoxData = hre.ethers.utils.solidityKeccak256(["string"], [concatValue])

    const _parentBoxHashData = generateSpecialBox(4, hashChildBoxData)
    const transaction = await _gachaContract.connect(_user1).addBoxData(gachaEvent.eventId, 4, [_parentBoxHashData], [1])
    const txData = await transaction.wait()

    const transaction2 = await _gachaContract.connect(_user1).addChildBox(gachaEvent.eventId, 4, [0,0,2,6] ,[_BoxHashDatas[0], _BoxHashDatas[1], _BoxHashDatas[2], _BoxHashDatas[3]], 
    [1,2,3,4])
    const txData2 = await transaction2.wait()
    const event = txData2.events[0].args
    console.log(event)
  })

  it("should change event status", async () => {
    const info = await _gachaContract.connect(_user1).gachaEventInformation(gachaEvent.eventId)
    console.log({info})
    const transaction = await _gachaContract.connect(_user1).changeStatusGachaEvent(gachaEvent.eventId, 1)
    const txData = await transaction.wait()
    const event = txData.events[0].args
    expect(event.eventId).to.be.equal(gachaEvent.eventId)
    expect(event.status).to.be.equal(1)
  })

  it("should buy normal box", async () => {
    const setOperator = await _boxContract.connect(_owner).setOperator(_gachaContract.address, true)
    await setOperator.wait()
    const transferToken = await _DKTokenContract.connect(_owner).transfer(_user1.address, BigInt(1000 * decimals))
    await transferToken.wait()
    const approveToken = await _DKTokenContract.connect(_user1).approve(_gachaContract.address, BigInt(1000 * decimals))
    await approveToken.wait()
    const transaction = await _gachaContract.connect(_user1).buyGachaBox(
      gachaEvent.eventId,
      _DKTokenContract.address,
      6,
      [],
      cid
    )
    const txData = await transaction.wait()
    const event = txData.events[4].args
    console.log("normal case box id",event.boxId)    
    normalBoxId = event.boxId
    const info = await _boxContract.connect(_owner).boxInformation(normalBoxId)
    console.log("box info: ", info)
  })

  it("should buy special box", async () => {
    
    const info = await _gachaContract.connect(_user1).gachaEventInformation(gachaEvent.eventId)
    const transaction = await _gachaContract.connect(_user1).buyGachaBox(
      gachaEvent.eventId,
      _DKTokenContract.address,
      4,
      [2, 1, 1],
      cid
    )
    const txData = await transaction.wait()
    const event = txData.events[4].args
    console.log("special case box id",event.boxId)
    specialBoxId = event.boxId
  })

  it("should unbox normal box", async () => {
    let paramCreateEvent = {
      nameEvent: "duc test",
      startTime: parseInt(Date.now()/1000),
      endTime: parseInt(Date.now()/1000 + 108000),
      totalTypeBox: 7,
      totalChildBoxes: 0,
      totalBox: 4,
      childBoxesByType: [0,0,0,0,0]
    }
    let LUCKY_BOX = 
    {
        typeBox: 6,
        boxesByType: 4,
        totalBoxesByRarity: ["0", "0", "0", "0", "1", "1", "1", "1", "0", "0"],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("100", "ether"),
        amounts:[1,1]
    }
    let EPIC_DOG_BOX = 
    {
        typeBox: 0,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("200", "ether"),
        amounts:[0,0]
    }
    let EPIC_EQUIPMENT_BOX = 
    {
        typeBox: 2,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("300", "ether"),
        amounts:[0,0]
    }
    let PREMIUM_DOG_BOX = 
    {
        typeBox: 1,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts:[0,0]
    }
    let PREMIUM_EQUIPMENT_BOX = 
    {
        typeBox: 3,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts:[0,0]
    }
    let GRAND_BOX = 
    {
        typeBox: 4,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts:[0,0]
    }
    let META_BOX = 
    {
        typeBox: 5,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts:[0,0]
    }
    const transaction1 = await _gachaContract.connect(_user1).createGachaEvent(
      paramCreateEvent.nameEvent,
      paramCreateEvent.startTime,
      paramCreateEvent.endTime,
      paramCreateEvent.totalTypeBox,
      paramCreateEvent.totalBox,
      paramCreateEvent.totalChildBoxes,
      paramCreateEvent.childBoxesByType,
      [LUCKY_BOX, EPIC_DOG_BOX, EPIC_EQUIPMENT_BOX, PREMIUM_DOG_BOX, PREMIUM_EQUIPMENT_BOX, GRAND_BOX, META_BOX]
    )
    const txData = await transaction1.wait()
    let event = txData.events[0].args

    const _EquipmentHashDatas = []
    
    for (let i = 0; i < 4; i++) {
      const _EquipmentHashData = generateEquipmentHashData(10, 10, 10)
      _EquipmentHashDatas.push(_EquipmentHashData)
    }

    const transaction2 = 
      await _gachaContract.connect(_user1).addBoxData(
        event.eventId, 
        6,
        [..._EquipmentHashDatas], 
        [1,2,3,4]
      )
    
    await transaction2.wait()

    const changeStatus = await _gachaContract.connect(_user1).changeStatusGachaEvent(event.eventId, 1)
    const txData5 = await changeStatus.wait()
    const event5 = txData5.events[0].args
    expect(event5.eventId).to.be.equal(event.eventId)
    expect(event5.status).to.be.equal(1)

    const transaction3 = await _gachaContract.connect(_user1).buyGachaBox(
      event.eventId,
      _DKTokenContract.address,
      6,
      [],
      cid
    )
    const txData3 = await transaction3.wait()
    const event3 = txData3.events[4].args
    const boxId = event3.boxId

    const setOperator1 = await _dogContract.connect(_owner).setOperator(_gachaContract.address, true)
    await setOperator1.wait()
    const setOperator2 = await _equipmentContract.connect(_owner).setOperator(_gachaContract.address, true)
    await setOperator2.wait()
    const equipmentNft = {
      speed: 10,
      stamina: 10,
      strength: 10,
      cid
    }
    const dogNft = {
      strength: 10,
      speed: 10,
      stamina: 10,
      weight: 10,
      isPermanentLoyalty: true,
      cid
    }
    const _DogHashData = generateDogHashData(10, 10, 10 ,10, cid)
    const _EquipmentHashData = generateEquipmentHashData(10, 10, 10 , cid)
    const _generateTokenHashData = generateTokenHashData(_DKTokenContract.address, BigInt(10*decimals))
    console.log("_DogHashData: ", _DogHashData)
    console.log("_EquipmentHashData: ",_EquipmentHashData)
    console.log("_generateTokenHashData: ",_generateTokenHashData)
    const dkToken = {
      tokenCurrency: _DKTokenContract.address,
      amount: BigInt(10*decimals)
    }

    let msg = "HEHEHEHEHEHEHEH";
    let hashMsg = web3.utils.soliditySha3(msg)
    let signature = await web3.eth.sign(
      hashMsg,
      _user1.address
    );
      console.log("_user1.address: ",_user1.address)
    const transaction = await _gachaContract.connect(_user1).unbox(
      _user1.address,
      signature,
      msg,
      boxId,
      2,
      [],
      equipmentNft,
      dogNft,
      dkToken
    )
  })

  it("should unbox special box", async () => {
    let paramCreateEvent = {
      nameEvent: "duc test",
      startTime: parseInt(Date.now()/1000),
      endTime: parseInt(Date.now()/1000 + 108000),
      totalTypeBox: 7,
      totalChildBoxes: 4,
      totalBox: 5,
      childBoxesByType: [2,1,1,0,0]
    }
    let LUCKY_BOX = 
    {
        typeBox: 6,
        boxesByType: 1,
        totalBoxesByRarity: ["1", "0", "0", "0", "0", "0", "0", "0", "0", "0"],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("100", "ether"),
        amounts:[0,0]
    }
    let EPIC_DOG_BOX = 
    {
        typeBox: 0,
        boxesByType: 2,
        totalBoxesByRarity: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("200", "ether"),
        amounts:[0,0]
    }
    let EPIC_EQUIPMENT_BOX = 
    {
        typeBox: 2,
        boxesByType: 1,
        totalBoxesByRarity: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("300", "ether"),
        amounts:[0,0]
    }
    let PREMIUM_DOG_BOX = 
    {
        typeBox: 1,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts:[0,0]
    }
    let PREMIUM_EQUIPMENT_BOX = 
    {
        typeBox: 3,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts:[0,0]
    }
    let GRAND_BOX = 
    {
        typeBox: 4,
        boxesByType: 1,
        totalBoxesByRarity: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 4,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts:[0,0]
    }
    let META_BOX = 
    {
        typeBox: 5,
        boxesByType: 0,
        totalBoxesByRarity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalChildBoxesByType: 0,
        tokenCurrency: _DKTokenContract.address,
        price: web3.utils.toWei("400", "ether"),
        amounts:[0,0]
    }
    const transaction1 = await _gachaContract.connect(_user1).createGachaEvent(
      paramCreateEvent.nameEvent,
      paramCreateEvent.startTime,
      paramCreateEvent.endTime,
      paramCreateEvent.totalTypeBox,
      paramCreateEvent.totalBox,
      paramCreateEvent.totalChildBoxes,
      paramCreateEvent.childBoxesByType,
      [LUCKY_BOX, EPIC_DOG_BOX, EPIC_EQUIPMENT_BOX, PREMIUM_DOG_BOX, PREMIUM_EQUIPMENT_BOX, GRAND_BOX, META_BOX]
    )
    const txData = await transaction1.wait()
    let event1 = txData.events[0].args
    const _EquipmentHashDatas = []
    const _DogHashDatas = []
    const _TokenHashDatas = []
    const _BoxHashDatas = []
    for (let i = 0; i < 4; i++) {
      const _DogHashData = generateDogHashData(10, 10, 10 ,10)
      _DogHashDatas.push(_DogHashData)
    }
    
    for (let i = 0; i < 4; i++) {
      const _EquipmentHashData = generateEquipmentHashData(10, 10, 10)
      _EquipmentHashDatas.push(_EquipmentHashData)
    }
    for (let i = 0; i < 2; i++) {
      const _generateTokenHashData = generateTokenHashData(_DKTokenContract.address, BigInt(10*decimals))
      _TokenHashDatas.push(_generateTokenHashData)
    }

    for (let i = 0; i < 2; i++) {
      const _childBoxHashData = generateBoxHashData(0, _DogHashDatas[i])
      _BoxHashDatas.push(_childBoxHashData)
    }
    const _childBoxHashData2 = generateBoxHashData(2, _EquipmentHashDatas[0])
    const _childBoxHashData3 = generateBoxHashData(6, _EquipmentHashDatas[1])
    _BoxHashDatas.push(_childBoxHashData2)
    _BoxHashDatas.push(_childBoxHashData3)
	  console.table(_BoxHashDatas)
    const concatValue = _BoxHashDatas.join(',')
    const hashParentData = hre.ethers.utils.solidityKeccak256(["string"], [concatValue])
    
    const _parentBoxHashData = generateSpecialBox(4, hashParentData)
    console.log({_parentBoxHashData})
    const transaction2 = await _gachaContract.connect(_user1).addBoxData(event1.eventId, 4, [_parentBoxHashData], [1])
    await transaction2.wait()

    const transaction3 = await _gachaContract.connect(_user1).addChildBox(event1.eventId, 4, [0,0,2,6] ,[_BoxHashDatas[0], _BoxHashDatas[1], _BoxHashDatas[2], _BoxHashDatas[3]], 
    [1,2,3,4])
    await transaction3.wait()

    const changeStatus = await _gachaContract.connect(_user1).changeStatusGachaEvent(event1.eventId, 1)
    const txData5 = await changeStatus.wait()
    const event5 = txData5.events[0].args
    expect(event5.eventId).to.be.equal(event1.eventId)
    expect(event5.status).to.be.equal(1)

    const transaction4 = await _gachaContract.connect(_user1).buyGachaBox(
      event1.eventId,
      _DKTokenContract.address,
      4,
      [2, 1, 1],
      cid
    )
    const txData4 = await transaction4.wait()
    const event = txData4.events[4].args
    const boxId = event.boxId

    const equipmentNft = {
      speed: 10,
      stamina: 10,
      strength: 10,
      cid
    }
    const dogNft = {
      strength: 10,
      speed: 10,
      stamina: 10,
      weight: 10,
      isPermanentLoyalty: true,
      cid
    }

    console.log("check hash value of grand box: ", hre.ethers.utils.solidityKeccak256(["uint256", "bytes32"], [4, hashParentData]))
    const boxNft = [
      [
        4,
        hashParentData,
        cid
      ],
      [
        0,
        _DogHashDatas[0],
        cid
      ],
      [
        0,
        _DogHashDatas[1],
        cid
      ],
      [
        2,
        _EquipmentHashDatas[0],
        cid
      ],
      [
        6,
        _EquipmentHashDatas[1],
        cid
      ]
    ]
    const dkToken = {
      tokenCurrency: _DKTokenContract.address,
      amount: BigInt(10*decimals)
    }
    let msg = "HEHEHEHEHEHEHEH";
    let hashMsg = web3.utils.soliditySha3(msg)
    let signature = await web3.eth.sign(
      hashMsg,
      _user1.address
    );
    const transaction = await _gachaContract.connect(_user1).unbox(
      _user1.address,
      signature,
      msg,
      boxId,
      3,
      boxNft,
      equipmentNft,
      dogNft,
      dkToken
    )
    const txData6 = await transaction.wait()
    const event6 = txData6.events[3].args
    console.log(event6)
  })
});

