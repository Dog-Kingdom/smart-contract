/* SPDX-License-Identifier: MIT */
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract BoxContract is
    UUPSUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ERC721BurnableUpgradeable,
    ERC721EnumerableUpgradeable,
    ERC721URIStorageUpgradeable
{
    using CountersUpgradeable for CountersUpgradeable.Counter;

    struct Box {
        uint256 typeBox;
        bytes32 boxData;
    }

    address private constant DEAD_ADDRESS =
        0x000000000000000000000000000000000000dEaD;

    CountersUpgradeable.Counter private _tokenIdCounter;
    mapping(address => bool) private _operators;
    mapping(uint256 => Box) private _boxOfTokenId;

    function initialize(
        string memory name_,
        string memory symbol_,
        address ownerAddress_
    ) external initializer {
        __UUPSUpgradeable_init();
        __Ownable_init();
        __Pausable_init();
        __ERC721_init(name_, symbol_);
        __ERC721Burnable_init();
        __ERC721Enumerable_init();
        __ERC721URIStorage_init();
        OwnableUpgradeable.transferOwnership(ownerAddress_);
    }

    event Operator(address operator, bool isOperator);
    event Mint(
        address recipient,
        uint256 tokenId,
        uint256 typeBox,
        bytes32 hashData
    );
    event Burn(uint256 tokenId);

    modifier onlyOperator() {
        require(_operators[_msgSender()], "Box: Sender is not operator");
        _;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Mint nft, move it from address(0) to `to` address and return token id
     * @param to is address of owner's nft
     * @param typeBox is type of gacha box
     * @param boxData is amount of token user can claim
     * @param cid is content identifier
     */
    function mint(
        address to,
        uint256 typeBox,
        bytes32 boxData,
        string memory cid
    ) public onlyOperator returns (uint256) {
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        _safeMint(to, tokenId);

        Box storage box = _boxOfTokenId[tokenId];
        box.typeBox = typeBox;
        box.boxData = boxData;
        string memory _tokenURI = string(abi.encodePacked(_baseURI(), cid));
        _setTokenURI(tokenId, _tokenURI);
        emit Mint(to, tokenId, typeBox, boxData);
        return tokenId;
    }

    /**
     * @dev set operator as an operator for this contract
     * operator cant mint or burn nft
     */
    function setOperator(address operator, bool isOperator_)
        external
        onlyOwner
    {
        _operators[operator] = isOperator_;
        emit Operator(operator, isOperator_);
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

    function burn(uint256 tokenId)
        public
        virtual
        override
        whenNotPaused
        onlyOperator
    {
        _burn(tokenId);
    }

    function isOperator(address operator) external view returns (bool) {
        return _operators[operator];
    }

    function boxInformation(uint256 tokenId)
        public
        view
        returns (uint256 typeBox, bytes32 boxData)
    {
        Box memory box = _boxOfTokenId[tokenId];
        typeBox = box.typeBox;
        boxData = box.boxData;
    }

    /**
     *  @dev get all token held by a user address
     *  @param owner is the token holder
     */
    function getTokensOfOwner(address owner)
        external
        view
        returns (uint256[] memory)
    {
        // get the number of token being hold by owner
        uint256 tokenCount = balanceOf(owner);

        if (tokenCount == 0) {
            // if owner has no balance return an empty array
            return new uint256[](0);
        } else {
            // query owner's tokens by index and add them to the token array
            uint256[] memory tokenList = new uint256[](tokenCount);
            for (uint256 i = 0; i < tokenCount; i++)
                tokenList[i] = tokenOfOwnerByIndex(owner, i);
            return tokenList;
        }
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
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
        override(ERC721URIStorageUpgradeable, ERC721Upgradeable)
    {
        safeTransferFrom(ownerOf(tokenId), DEAD_ADDRESS, tokenId);
        require(ownerOf(tokenId) == DEAD_ADDRESS, "Burn fail");
        emit Burn(tokenId);
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

    function _baseURI() internal view virtual override returns (string memory) {
        return "https://defiforyou.mypinata.cloud/ipfs/";
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
