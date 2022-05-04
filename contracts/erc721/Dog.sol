/* SPDX-License-Identifier: MIT */
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../utils/ArrayLib.sol";

contract DogContract is
    UUPSUpgradeable,
    PausableUpgradeable,
    OwnableUpgradeable,
    ERC721BurnableUpgradeable,
    ERC721EnumerableUpgradeable,
    ERC721URIStorageUpgradeable
{
    using CountersUpgradeable for CountersUpgradeable.Counter;

    struct Dog {
        uint256 speed;
        uint256 strength;
        uint256 durability;
        uint256 weight;
        uint256 loyalty;
        bool isPermanentLoyalty;
        uint256 level;
        uint256 pregnantTime;
        uint256 exp;
    }

    address private constant DEAD_ADDRESS =
        0x000000000000000000000000000000000000dEaD;

    CountersUpgradeable.Counter private _tokenIdCounter;
    mapping(address => bool) private _operators;
    mapping(uint256 => Dog) private _dogs;

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

    event Operator(address operator, bool isOperator);
    event Minted(address recipient, uint256 tokenId);
    event Burn(uint256 tokenId);

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

    function mint(
        address to,
        uint256 strength,
        uint256 speed,
        uint256 durability,
        uint256 weight,
        bool isPermanentLoyalty,
        string memory cid
    ) public onlyOperator returns (uint256) {
        require(strength >= 1, "strength is invalid");
        require(speed >= 1, "speed is invalid");
        require(durability >= 1, "durability is invalid");
        require(weight >= 1, "weight is invalid");
        require(bytes(cid).length >= 1, "uri is invalid");
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        _safeMint(to, tokenId);
        Dog storage dog = _dogs[tokenId];
        dog.speed = speed;
        dog.strength = strength;
        dog.durability = durability;
        dog.level = 1;
        dog.pregnantTime = 6;
        dog.exp = 0;
        if (tokenId < 300000) {
            isPermanentLoyalty = true;
        } else {
            isPermanentLoyalty = false;
        }
        string memory _tokenURI = string(abi.encodePacked(_baseURI(), cid));

        _setTokenURI(tokenId, _tokenURI);
        emit Minted(to, tokenId);
        return tokenId;
    }

    function setOperator(address operator, bool isOperator) external onlyOwner {
        _operators[operator] = isOperator;
        emit Operator(operator, isOperator);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return "https://defiforyou.mypinata.cloud/ipfs/";
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

    function levelUp(uint256 tokenId, Dog memory dog) public {
        require(_exists(tokenId), "Token not found");
        require(dog.strength >= 1, "strength is invalid");
        require(dog.speed >= 1, "speed is invalid");
        require(dog.durability >= 1, "durability is invalid");
        require(dog.weight >= 1, "weight is invalid");
        require(dog.level >= 1, "level is invalid");
        require(dog.pregnantTime >= 1, "bleedingTime is invalid");
        require(dog.exp >= 1, "exp is invalid");
        _dogs[tokenId].speed = dog.speed;
        _dogs[tokenId].strength = dog.strength;
        _dogs[tokenId].durability = dog.durability;
        _dogs[tokenId].level = dog.level;
        _dogs[tokenId].pregnantTime = dog.pregnantTime;
        _dogs[tokenId].exp = dog.exp;
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

    function _exists(uint256 tokenId)
        internal
        view
        virtual
        override
        returns (bool)
    {
        return super._exists(tokenId);
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

    function _burn(uint256 tokenId)
        internal
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
    {
        super._burn(tokenId);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
