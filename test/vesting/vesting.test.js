const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");
const hre = require("hardhat");
const vestingBuildName = "Vesting"
const dokoBuildName = "DokoToken"
const decimals = 10 ** 18// decimal

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe("Vesting",async function () {
  let _vestingContract
  let _dokoContract
  let _deployer, _owner, _user1, _user2
  let _vestingId;
  before(async function() {
    
    [_deployer, _owner, _user1, _user2] = await hre.ethers.getSigners()
    const dokoArtifact = await hre.ethers.getContractFactory(dokoBuildName)
    const vestingArtifact = await hre.ethers.getContractFactory(vestingBuildName)

    const DKTokenContract = await dokoArtifact.deploy("DOKO", "DOKO", BigInt(10000 * decimals), _owner.address);
    
    _dokoContract = await DKTokenContract.deployed()
    const mintToken = await _dokoContract.connect(_owner).mint(_owner.address,BigInt(10000 * decimals))
    await mintToken.wait()
    const dokoAddress = _dokoContract.address
    const deployerAddress = _deployer.address
    const vestingContract = await upgrades.deployProxy(vestingArtifact, [dokoAddress, deployerAddress], { kind: "uups"})

    _vestingContract = await vestingContract.deployed()
    const setOperator = await _vestingContract.setOperator(_owner.address, true)
    await setOperator.wait()
  
  })
  it("should revert with message `vest-claim-invalid`", async function () {
    const round = [
      [
        0,
        4,
        1,
        100,
        false
      ],
      [
        0,
        4,
        1,100,
        false
      ]
    ]
    const _schemeInfo = {
      name: "duc test scheme",
      vestTime: 0,
    }
    console.table([round[0], round[1]])
    await expect(_vestingContract.newScheme(
      _schemeInfo.name,
      _schemeInfo.vestTime,
      [round[0], round[1]],
      true
    )).to.be.revertedWith("vest-claim-invalid")
  })

  it("should revert with message `scheme-name-invalid`", async function () {
    const round = [
      [
        0,
        4,
        1,100,
        false
      ],
      [
        0,
        4,
        1,100,
        false
      ]
    ]
    const _schemeInfo = {
      name: "",
      vestTime: 2,
    }
    console.table([round[0], round[1]])
    await expect(_vestingContract.newScheme(
      _schemeInfo.name,
      _schemeInfo.vestTime,
      [round[0], round[1]],
      true
    )).to.be.revertedWith("scheme-name-invalid")
  })

  it("should emit event newScheme", async function () {
    const round = [
      [
        0,
        500,
        1,100,
        false
      ],
      [
        0,
        250,
        2,100,
        true
      ]
    ]
    const _schemeInfo = {
      name: "duc test scheme",
      vestTime: 2,
    }
    const transaction = await _vestingContract.newScheme(
      _schemeInfo.name,
      _schemeInfo.vestTime,
      [round[0], round[1]],
      true
    )
    const txData = await transaction.wait()
    const event = txData.events[0].args
    const getScheme = await _vestingContract.getSchemeById(event.schemeBcId)
    expect(event.name).to.equal(getScheme.name)
    expect(event.vestTime).to.equal(getScheme.vestTime)
    expect(event.canUpdate).to.equal(getScheme.canUpdate)
    expect(event.rounds.length).to.equal(getScheme.rounds.length)
  })

  it("should revert with message `Scheme not found`", async () => {
    const round = [
      [
        0,
        500,
        1,100,
        false
      ],
      [
        0,
        500,
        1,100,
        false
      ]
    ]
    const _schemeInfo = {
      name: "duc test scheme update",
      vestTime: 2,
    }

    await expect(_vestingContract.updateScheme(
      0,
      _schemeInfo.name,
      _schemeInfo.vestTime,
      [round[0], round[1]],
      true
    )).to.be.revertedWith("Scheme not found")
  })

  it("should emit event updateEvent", async function () {
    const round = [
      [
        0,
        500,
        1,100,
        false
      ],
      [
        0,
        500,
        1,100,
        false
      ]
    ]
    const _schemeInfo = {
      name: "duc test scheme update",
      vestTime: 2,
    }
    const transaction = await _vestingContract.updateScheme(
      1,
      _schemeInfo.name,
      _schemeInfo.vestTime,
      [round[0], round[1]],
      true
    )
    const txData = await transaction.wait()
    const event = txData.events[0].args
    const getScheme = await _vestingContract.getSchemeById(event.schemeBcId)
    expect(event.name).to.equal(getScheme.name)
    expect(event.vestTime).to.equal(getScheme.vestTime)
    expect(event.canUpdate).to.equal(getScheme.canUpdate)
    expect(event.rounds.length).to.equal(getScheme.rounds.length)
  })

  it("should revert with message `scheme not found`", async function () {

    const _vestingInfo = {
      wallet: _owner.address,
      schemeId: 0,
      startTime: parseInt((Date.now()/1000) + 10),
      totalAmount: BigInt(10 *decimals),
      vestedAmount: 0
    }
    await expect(_vestingContract.newVesting(
      [_vestingInfo.wallet, _vestingInfo.schemeId, _vestingInfo.startTime, _vestingInfo.totalAmount, _vestingInfo.vestedAmount]
    )).to.be.revertedWith("scheme not found")
  })
  
  it("should revert with message `wallet-invalid`", async function () {
    
    const _vestingInfo = {
      wallet: "0x0000000000000000000000000000000000000000",
      schemeId: 1,
      startTime: parseInt((Date.now()/1000) + 10),
      totalAmount: BigInt(10 *decimals),
      vestedAmount: 0
    }
    await expect(_vestingContract.newVesting(
      [_vestingInfo.wallet, _vestingInfo.schemeId, _vestingInfo.startTime, _vestingInfo.totalAmount, _vestingInfo.vestedAmount]
    )).to.be.revertedWith("wallet invalid")
  })

  it("should revert with message `startTime must be greater than block.timestamp`", async function () {
    const _vestingInfo = {
      wallet: _owner.address,
      schemeId: 1,
      startTime: parseInt((Date.now()/1000) - 100),
      totalAmount: BigInt(10 *decimals),
      vestedAmount: 0
    }
    await expect(_vestingContract.newVesting(
      [_vestingInfo.wallet, _vestingInfo.schemeId, _vestingInfo.startTime, _vestingInfo.totalAmount, _vestingInfo.vestedAmount]
    )).to.be.revertedWith("startTime must be greater than block.timestamp")
  })

  it("should revert with message `totalAmount must be greater than 0`", async function () {
    const _vestingInfo = {
      wallet: _owner.address,
      schemeId: 1,
      startTime: parseInt((Date.now()/1000) + 100),
      totalAmount: 0,
      vestedAmount: 0
    }
    await expect(_vestingContract.newVesting(
      [_vestingInfo.wallet, _vestingInfo.schemeId, _vestingInfo.startTime, _vestingInfo.totalAmount, _vestingInfo.vestedAmount]
    )).to.be.revertedWith("totalAmount must be greater than 0")
  })

  it("should revert with message `totalAmount invalid`", async function () {
    const _vestingInfo = {
      wallet: _owner.address,
      schemeId: 1,
      startTime: parseInt((Date.now()/1000) + 100),
      totalAmount: 2,
      vestedAmount: 3
    }
    await expect(_vestingContract.newVesting(
      [_vestingInfo.wallet, _vestingInfo.schemeId, _vestingInfo.startTime, _vestingInfo.totalAmount, _vestingInfo.vestedAmount]
    )).to.be.revertedWith("totalAmount invalid")
  })

  it("should emit vesting event", async function () {
    
    const approve = await _dokoContract.connect(_owner).approve(_vestingContract.address, BigInt(10000 *decimals));
    const checkBalance = await _dokoContract.connect(_owner).balanceOf(_owner.address)
    const txApprove = await approve.wait()
    const eventApprove = txApprove.events[0].args
    const getErc20Token = await _vestingContract.erc20Token()
    expect(getErc20Token).to.equal(_dokoContract.address)
    const _vestingInfo = {
      wallet: _owner.address,
      schemeId: 1,
      startTime: parseInt((Date.now()/1000+20)),
      totalAmount: BigInt(10 *decimals),
      vestedAmount: 0
    }
    const transaction = await _vestingContract.connect(_owner).newVesting(
      [
        _vestingInfo.wallet,
        _vestingInfo.schemeId,
        _vestingInfo.startTime, 
        _vestingInfo.totalAmount,
        _vestingInfo.vestedAmount
      ]
    )
    const txData = await transaction.wait()
    const event = txData.events[2].args

    expect(event.vestingBcId).to.equal(1)

    _vestingId = event.vestingBcId
  })

  it("should revert with message `Scheme was set to vesting event`", async () => {
    const round = [
      [
        0,
        500,
        1,
        100,
        false
      ],
      [
        0,
        500,
        1,
        100,
        false
      ]
    ]
    const _schemeInfo = {
      name: "duc test scheme update 2",
      vestTime: 2,
    }

    await expect(_vestingContract.updateScheme(
      1,
      _schemeInfo.name,
      _schemeInfo.vestTime,
      [round[0], round[1]],
      true
    )).to.be.revertedWith("Scheme was set to vesting event")
  })

  it("should emit claim event", async function () {
    const listIds = [_vestingId]
    const transaction = await _vestingContract.connect(_owner).claim(listIds)
    const txData = await transaction.wait()
    const event = txData.events[0].args
    console.log({event})
    expect(event.amount).to.not.NaN
  })
  
  it("should emit with event newVestings", async function () {
    const approve = await _dokoContract.connect(_owner).approve(_vestingContract.address, BigInt(10000 *decimals));
    const txApprove = await approve.wait()
    vestingsInput = [
      {
        wallet: _owner.address,
        schemeId: 1,
        startTime: parseInt(Date.now()/1000 + 20),
        totalAmount: BigInt(10 *decimals),
        vestedAmount: 0
      },
      {
        wallet: _owner.address,
        schemeId: 1,
        startTime: parseInt(Date.now()/1000 + 20),
        totalAmount: BigInt(10 *decimals),
        vestedAmount: BigInt(1 * decimals)
      },
      {
        wallet: _owner.address,
        schemeId: 1,
        startTime: parseInt(Date.now()/1000 + 20),
        totalAmount: BigInt(10 *decimals),
        vestedAmount: BigInt(2 * decimals)
      },
    ]

    const transaction = await _vestingContract.connect(_owner).newVestings(
      [...vestingsInput]
    )

    const txData = await transaction.wait()

    event1 = txData.events[2].args
    event2 = txData.events[5].args
    event3 = txData.events[8].args

    expect(event1.vestingBcId).to.equal(2)
    expect(event2.vestingBcId).to.equal(3)
    expect(event3.vestingBcId).to.equal(4)

  })

  it("should emit with event newVestings 2", async function () {

    vestingsInput = [
      {
        wallet: _owner.address,
        schemeId: 1,
        startTime: parseInt(Date.now()/1000 + 20),
        totalAmount: BigInt(10 *decimals),
        vestedAmount: 0
      },
      {
        wallet: _owner.address,
        schemeId: 1,
        startTime: parseInt(Date.now()/1000 + 20),
        totalAmount: BigInt(10 *decimals),
        vestedAmount: BigInt(1 * decimals)
      },
      {
        wallet: _owner.address,
        schemeId: 1,
        startTime: parseInt(Date.now()/1000 + 50),
        totalAmount: BigInt(10 *decimals),
        vestedAmount: BigInt(2 * decimals)
      },
    ]

    const transaction = await _vestingContract.connect(_owner).newVestings(
      [...vestingsInput]
    )

    const txData = await transaction.wait()

    event1 = txData.events[2].args
    event2 = txData.events[5].args
    event3 = txData.events[8].args

    expect(event1.vestingBcId).to.equal(5)
    expect(event2.vestingBcId).to.equal(6)
    expect(event3.vestingBcId).to.equal(7)

  })

  it("should emit with event claim list vesting", async () => {
    await sleep(20000)
    const vestingList = [5,6,7]
    const transaction = await _vestingContract.connect(_owner).claim(vestingList)
    const txData = await transaction.wait()
    console.log({txData})
    const event = txData.events[1].args
    console.log({event})
    expect(event.amount).to.not.equal(BigInt(0))
    for (let i = 0; i < event.vestingIds; i++) {
      expect(event.vestingIds[i]).equal(i+1)
    }
  })

  it("should revert with message `Vesting: Sender is not operator`", async () => {
    await expect(_vestingContract.connect(_user1).cancelVesting(1)).to.be.revertedWith("Vesting: Sender is not operator");
  })

  it("should revert with message `vesting not found`", async() => {
    
    const checkBalanceOfBefore = await _dokoContract.balanceOf(_owner.address)
    const checkAllowance = await _dokoContract.allowance(_owner.address, _vestingContract.address);

    await expect( _vestingContract.connect(_owner).updateVesting(
      0,
      {
        wallet: _owner.address,
        schemeId: 1,
        startTime: parseInt(Date.now()/1000 + 60),
        totalAmount: BigInt(11*decimals),
        vestedAmount: 0
      }
    )).to.be.revertedWith("vesting not found")

  })

  it("should revert with message `This vesting event had already begun`", async() => {
    const _vestingInfo = {
      wallet: _owner.address,
      schemeId: 1,
      startTime: parseInt((Date.now()/1000+25)),
      totalAmount: BigInt(10 *decimals),
      vestedAmount: 0
    }
    const transaction = await _vestingContract.connect(_owner).newVesting(
      [
        _vestingInfo.wallet,
        _vestingInfo.schemeId,
        _vestingInfo.startTime, 
        _vestingInfo.totalAmount,
        _vestingInfo.vestedAmount
      ]
    )
    const txData = await transaction.wait()
    const event = txData.events[2].args
      await sleep(20000)
    await expect( _vestingContract.connect(_owner).updateVesting(
      event.vestingBcId,
      {
        wallet: _owner.address,
        schemeId: 1,
        startTime: parseInt(Date.now()/1000 + 40),
        totalAmount: BigInt(11*decimals),
        vestedAmount: 0
      }
    )).to.be.revertedWith("This vesting event had already begun")

  })

  it("should emit event updateVesting", async() => {
    const _vestingInfo = {
      wallet: _owner.address,
      schemeId: 1,
      startTime: parseInt((Date.now()/1000+25)),
      totalAmount: BigInt(10 *decimals),
      vestedAmount: 0
    }
    const createVesting = await _vestingContract.connect(_owner).newVesting(
      [
        _vestingInfo.wallet,
        _vestingInfo.schemeId,
        _vestingInfo.startTime, 
        _vestingInfo.totalAmount,
        _vestingInfo.vestedAmount
      ]
    )
    const vestingData = await createVesting.wait()
    const vestingEvent = vestingData.events[2].args
    const checkBalanceOfBefore = await _dokoContract.balanceOf(_owner.address)

    const transaction = await _vestingContract.connect(_owner).updateVesting(
      vestingEvent.vestingBcId,
      {
        wallet: _owner.address,
        schemeId: 1,
        startTime: parseInt(Date.now()/1000 + 60),
        totalAmount: BigInt(11*decimals),
        vestedAmount: 0
      }
    )
    await transaction.wait()
    const checkBalanceOfAfter = await _dokoContract.balanceOf(_deployer.address)
    expect(checkBalanceOfBefore).to.above(checkBalanceOfAfter)
  })

  it("should emit with event CancelVesting", async() => {
    const transaction = await _vestingContract.cancelVesting(1)
    const txData = await transaction.wait()
    const event = txData.events[0].args
    expect(event.vestingId).to.equal(1)
  })

  it("should emit with event claim and amount equal 0", async () => {
    const vestingList = [5,6]
    const transaction = await _vestingContract.connect(_owner).claim(vestingList)
    const txData = await transaction.wait()
    const event = txData.events[0].args
    expect(event.amount).to.equal(BigInt(0))
  })

  it("should emit with event EmergencyWithdraw", async() => {
    const transaction = await _vestingContract.pause()
    await transaction.wait()
    const emergency = await _vestingContract.emergencyWithdraw()
    await emergency.wait()
    const unpause = await _vestingContract.unpause()
    await unpause.wait()
  })
})