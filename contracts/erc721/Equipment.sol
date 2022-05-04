/* SPDX-License-Identifier: MIT */
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "../utils/ArrayLib.sol";

contract EquipmentContract is
    UUPSUpgradeable,
    PausableUpgradeable,
    OwnableUpgradeable,
    ERC721BurnableUpgradeable,
    ERC721EnumerableUpgradeable,
    ERC721URIStorageUpgradeable
{
    using CountersUpgradeable for CountersUpgradeable.Counter;

    struct Equipment {
        uint256 strength;
        uint256 speed;
        uint256 durability;
        uint256 level;
        uint256 exp;
    }

    address private constant DEAD_ADDRESS =
        0x000000000000000000000000000000000000dEaD;

    CountersUpgradeable.Counter private _tokenIdCounter;
    mapping(address => bool) private _operators;
    mapping(uint256 => Equipment) private _equipments;

    event Operator(address operator, bool isOperator);
    event Minted(address recipient, uint256 tokenId);
    event Burn(uint256 tokenId);

    function initialize(
        string memory name,
        string memory symbol,
        address ownerAddress
    ) external initializer {
        __UUPSUpgradeable_init();
        __Ownable_init();
        __Pausable_init();
        __ERC721_init(name, symbol);

        OwnableUpgradeable.transferOwnership(ownerAddress);
        _operators[msg.sender] = true;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    modifier onlyOperator() {
        require(_operators[_msgSender()], "not operator");
        _;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setOperator(address operator, bool isOperator) external onlyOwner {
        _operators[operator] = isOperator;
        emit Operator(operator, isOperator);
    }

    function mint(
        address to,
        uint256 speed,
        uint256 durability,
        uint256 strength,
        string memory cid
    ) external onlyOperator returns (uint256) {
        require(speed <= 50 ether, "speed invalid");
        require(durability <= 50 ether, "durability invalid");
        require(strength <= 50 ether, "strength invalid");
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        _safeMint(to, tokenId);
        Equipment storage equipment = _equipments[tokenId];
        equipment.speed = speed;
        equipment.durability = durability;
        equipment.strength = strength;
        equipment.level = 1;
        equipment.exp = 0;
        string memory _tokenURI = string(abi.encodePacked(_baseURI(), cid));
        _setTokenURI(tokenId, _tokenURI);
        emit Minted(to, tokenId);
        return tokenId;
    }

    function getOwnedTokenIds(address addr)
        external
        view
        returns (uint256[] memory)
    {
        uint256 numNFTs = balanceOf(addr);
        if (numNFTs == 0) return new uint256[](0);
        else {
            uint256[] memory ownedtokenIds = new uint256[](numNFTs);
            for (uint256 i = 0; i < numNFTs; i++)
                ownedtokenIds[i] = tokenOfOwnerByIndex(addr, i);
            return ownedtokenIds;
        }
    }

    function burnNFT(uint256 tokenId) external onlyOperator {
        require(_isApprovedOrOwner(msg.sender, tokenId));
        safeTransferFrom(ownerOf(tokenId), DEAD_ADDRESS, tokenId);
        require(ownerOf(tokenId) == DEAD_ADDRESS, "Burn fail");
        emit Burn(tokenId);
    }

    function levelUp(uint256 tokenId, Equipment memory equipment) public {
        require(_exists(tokenId), "Token not found");
        require(equipment.strength >= 1, "strength is invalid");
        require(equipment.speed >= 1, "speed is invalid");
        require(equipment.durability >= 1, "durability is invalid");
        require(equipment.level >= 1, "level is invalid");
        require(equipment.exp >= 1, "exp is invalid");
        _equipments[tokenId].speed = equipment.speed;
        _equipments[tokenId].strength = equipment.strength;
        _equipments[tokenId].durability = equipment.durability;
        _equipments[tokenId].level = equipment.level;
        _equipments[tokenId].exp = equipment.exp;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory tokenIds
    ) public whenNotPaused {
        _safeBatchTransferFrom(from, to, tokenIds, "");
    }

    function safeBatchTransferFromWithData(
        address from,
        address to,
        uint256[] memory tokenIds,
        bytes memory data
    ) public whenNotPaused {
        _safeBatchTransferFrom(from, to, tokenIds, data);
    }

    function _burn(uint256 tokenId)
        internal
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
    {
        super._burn(tokenId);
    }

    function _isApprovedOrOwner(address _address, uint256 _tokenId)
        internal
        view
        override
        returns (bool)
    {
        if (_operators[_address]) {
            return true;
        }
        return super._isApprovedOrOwner(_address, _tokenId);
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return "https://ipfs.io/ipfs/";
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    )
        internal
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        whenNotPaused
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function _safeBatchTransferFrom(
        address _from,
        address _to,
        uint256[] memory _tokenIds,
        bytes memory _data
    ) internal {
        require(_tokenIds.length > 0, "Box: Token Id list must not empty");
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            safeTransferFrom(_from, _to, _tokenIds[i], _data);
        }
    }
}
