const { expect } = require("chai");
const { ethers } = require("hardhat");

const DKTokenBuildName = "DKToken"
const DoKoBuildName = "DokoToken";
const MarketplaceBuildName = "Marketplace"
const DogBuildName = "DogContract"
const decimals = 10 ** 18
const cid = "QmZECPyLHgRDH89t6ruJj3fngh8bM3XPJVq3D76JFELRA8"

describe("Marketplace", function () {
  let _marketplaceContract
  let _dogContract
  let _dkTokenContract
  let _dokoTokenContract
  let _tokenId
  let _tokenId2
  let _tokenId3
  let _orderId
  before(async() => {
    [
      _deployer,
      _owner,
      _user1,
      _user2
    ] = await ethers.getSigners();

    MarketplaceArtifact = await hre.ethers.getContractFactory(MarketplaceBuildName)
    DogArtifact = await hre.ethers.getContractFactory(DogBuildName)
    DKTokenArtifact = await hre.ethers.getContractFactory(DKTokenBuildName)
    DOKOTokenArtifact = await hre.ethers.getContractFactory(DoKoBuildName)

    const dkTokenContract = await upgrades.deployProxy(DKTokenArtifact, ["DK", "DK", _deployer.address], {kind: "uups"})
    _dkTokenContract = await dkTokenContract.deployed()

    const dogContract = await upgrades.deployProxy(DogArtifact, ["dog", "d", _owner.address], { kind: "uups"});
    _dogContract = await dogContract.deployed()

    const dokoTokenContract = await DOKOTokenArtifact.deploy("DOKO", "DOKO", BigInt(10000 * decimals), _owner.address);
    _dokoTokenContract = await dokoTokenContract.deployed()

    // address feeReceiver_, uint256 feeRate_, uint256 zoom_

    const feeRate = 5;
    const zoom = 100;

    const marketplaceContract = await upgrades.deployProxy(MarketplaceArtifact, [_owner.address, feeRate, zoom] , {kind: "uups"})
    _marketplaceContract = await marketplaceContract.deployed()

    const approveToken = await _dokoTokenContract.connect(_owner).approve(_marketplaceContract.address, BigInt(10000 * decimals))
  })

/**
 * testcase create example token 
 */

  it("should return token id", async () => {
    const transaction = await _dogContract.mint(
      _deployer.address,
      10,10,10,10,true, cid
    )
    const txData = await transaction.wait()
    const event = txData.events[0].args
    expect(event.tokenId).to.equal(0)
    _tokenId = event.tokenId
    console.log({_tokenId}, "owner: "+_deployer.address)
    console.log({event})
    const transaction2 = await _dogContract.mint(
      _deployer.address,
      11,11,11,11,true, cid
    )
    const txData2 = await transaction2.wait()
    const event2 = txData2.events[0].args
    expect(event2.tokenId).to.equal(1)
    _tokenId2 = event2.tokenId
    console.log({_tokenId2})

    const transaction3 = await _dogContract.mint(
      _deployer.address,
      12,12,12,12,true, cid
    )
    const txData3 = await transaction3.wait()
    const event3 = txData3.events[0].args
    expect(event3.tokenId).to.equal(2)
    _tokenId3 = event3.tokenId
    console.log({_tokenId3})
  })

/**
 * testcase putOnSale
 */

  it(`should add address into white list collection`, async () => {
    const transaction = await _marketplaceContract.setWhitelistCollections(
      _dogContract.address, true
    )
    const txData = await transaction.wait()
    const event = txData.events[0].args
    expect(event.collectionAddress).to.equal(_dogContract.address)
    expect(event.isWhitelist).to.equal(true)
  })

  it("should revert with message `Spender is not approved`", async () => {
    const dataPutOnSale = {
      tokenId: _tokenId2,
      price : BigInt(100*decimals),
      currency: _dokoTokenContract.address,
      collectionAddress: _dogContract.address
    }
    await expect(_marketplaceContract.putOnSales(
      dataPutOnSale.tokenId,
      dataPutOnSale.price,
      dataPutOnSale.currency,
      dataPutOnSale.collectionAddress
    )).to.be.revertedWith("Spender is not approved")
  })
  
  it("should approve all token to marketplace contract", async () => {
    const transaction = await _dogContract.setApprovalForAll(_marketplaceContract.address, true);
    await transaction.wait()
  })

  it("should emit event",async () => {

    const dataPutOnSale = {
      tokenId: _tokenId,
      price : BigInt(100*decimals),
      currency: _dokoTokenContract.address,
      collectionAddress: _dogContract.address
    }
    const transaction = await _marketplaceContract.connect(_deployer).putOnSales(
      dataPutOnSale.tokenId,
      dataPutOnSale.price,
      dataPutOnSale.currency,
      dataPutOnSale.collectionAddress
    )
    const txData = await transaction.wait()
    // console.log({txData})
    const event = txData.events[2].args

    console.log({event})
    expect(event.orderId).to.equal(0)
    _orderId = event.orderId
  })

  it("should revert with message `Token is already put on sales`", async () => {
    const dataPutOnSale = {
      tokenId: _tokenId,
      price : BigInt(100*decimals),
      currency: _dokoTokenContract.address,
      collectionAddress: _dogContract.address
    }
    await expect(_marketplaceContract.putOnSales(
      dataPutOnSale.tokenId,
      dataPutOnSale.price,
      dataPutOnSale.currency,
      dataPutOnSale.collectionAddress
    )).to.be.revertedWith("Token is already put on sales")
  })

  it("should revert with message `Collection address is not allowed`", async () => {
    const dataPutOnSale = {
      tokenId: _tokenId2,
      price : BigInt(100*decimals),
      currency: _dokoTokenContract.address,
      collectionAddress: _dokoTokenContract.address
    }
    await expect(_marketplaceContract.putOnSales(
      dataPutOnSale.tokenId,
      dataPutOnSale.price,
      dataPutOnSale.currency,
      dataPutOnSale.collectionAddress
    )).to.be.revertedWith("Collection address is not allowed")
  })
  it("should revert with message `Not token owner`", async () => {
    const dataPutOnSale = {
      tokenId: _tokenId2,
      price : BigInt(100*decimals),
      currency: _dokoTokenContract.address,
      collectionAddress: _dogContract.address
    }
    await expect(_marketplaceContract.connect(_owner).putOnSales(
      dataPutOnSale.tokenId,
      dataPutOnSale.price,
      dataPutOnSale.currency,
      dataPutOnSale.collectionAddress
    )).to.be.revertedWith("Not token owner")
  })

  it("should revert with message `Invalid price`", async () => {
    const dataPutOnSale = {
      tokenId: _tokenId2,
      price : 0,
      currency: _dokoTokenContract.address,
      collectionAddress: _dogContract.address
    }
    await expect(_marketplaceContract.putOnSales(
      dataPutOnSale.tokenId,
      dataPutOnSale.price,
      dataPutOnSale.currency,
      dataPutOnSale.collectionAddress
    )).to.be.revertedWith("Invalid price")
  })

/**
 * testcase 
 */

  it("should emit event BuyNFT", async () => {
    const checkOwnerOf = await _dogContract.ownerOf(_tokenId);
    console.log({checkOwnerOf})

    const transaction = await _marketplaceContract.connect(_owner).buyNFT(_orderId)
    const txData = await transaction.wait()
    const event = txData.events[6].args
    console.log({event})
    expect(event.purchase.status).to.equal(1)
  })
  it("should revert with message `Sales unavailable`", async () => {
    await expect(_marketplaceContract.buyNFT(_orderId)).to.be.revertedWith("Sales unavailable")
  })
  it("should revert with message `Buying owned NFT`", async () => {
    const dataPutOnSale = {
      tokenId: _tokenId2,
      price : BigInt(200 * decimals),
      currency: _dokoTokenContract.address,
      collectionAddress: _dogContract.address
    }
    const transaction = await _marketplaceContract.connect(_deployer).putOnSales(
      dataPutOnSale.tokenId,
      dataPutOnSale.price,
      dataPutOnSale.currency,
      dataPutOnSale.collectionAddress
    )
    const txData = await transaction.wait()
    const event = txData.events[2].args
    console.log({event})
    await expect(_marketplaceContract.connect(_deployer).buyNFT(dataPutOnSale.tokenId)).to.be.revertedWith("Buying owned NFT")
  })

  /**
 * testcase cancelListing
 */

  it("should revert with message `Order's seller is required`", async () => {
    await expect(_marketplaceContract.connect(_owner).cancelListing(_orderId)).to.be.revertedWith("Order's seller is required")
  })

  it("should emit event CancelListing", async () => {
    const dataPutOnSale = {
      tokenId: _tokenId3,
      price : BigInt(200 * decimals),
      currency: _dokoTokenContract.address,
      collectionAddress: _dogContract.address
    }
    const transaction1 = await _marketplaceContract.connect(_deployer).putOnSales(
      dataPutOnSale.tokenId,
      dataPutOnSale.price,
      dataPutOnSale.currency,
      dataPutOnSale.collectionAddress
    )
    const txData1 = await transaction1.wait()
    const event1 = txData1.events[2].args

    const transaction2 = await _marketplaceContract.connect(_deployer).cancelListing(event1.orderId)
    const txData2 = await transaction2.wait()
    const event2 = txData2.events[0].args
    console.log(event2)
  })

})