// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../erc20/DKToken.sol";
import "../erc721/Dog.sol";
import "../erc721/Equipment.sol";
import "../erc721/Box.sol";
import "../utils/CommonLib.sol";
import "./IMarketplace.sol";

contract Marketplace is
    UUPSUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    IMarketplace,
    ERC721HolderUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;
    using AddressUpgradeable for address;
    using CountersUpgradeable for CountersUpgradeable.Counter;

    CountersUpgradeable.Counter private _orderIdCounter;

    address public feeReceiver;
    uint256 public feeRate;
    uint256 public ZOOM;

    mapping(uint256 => Order) public orders;

    mapping(address => bool) private _whitelistCollections;
    mapping(address => bool) private _whiteListCurrency;

    mapping(address => bool) private _admins;
    mapping(address => bool) private _operators;

    function initialize(
        address feeReceiver_,
        uint256 feeRate_,
        uint256 zoom_
    ) public initializer {
        __UUPSUpgradeable_init();
        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        feeReceiver = feeReceiver_;
        feeRate = feeRate_;
        ZOOM = zoom_;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function putOnSales(
        uint256 tokenId,
        uint256 price,
        address currency,
        address collectionAddress
    ) external override whenNotPaused nonReentrant {
        require(
            _isWhitelistCollection(collectionAddress),
            "Collection address is not allowed"
        );

        require(
            _isWhitelistCurrency(currency),
            "currency address is not allowed"
        );

        require(
            ERC721(collectionAddress).ownerOf(tokenId) == _msgSender(),
            "Not token owner"
        );
        require(price > 0, "Invalid price");

        uint256 orderId = _orderIdCounter.current();

        Order storage _order = orders[orderId];
        _order.owner = payable(_msgSender());
        _order.tokenId = tokenId;
        _order.collectionAddress = collectionAddress;
        _order.currency = currency;
        _order.price = price;
        _order.status = OrderStatus.ON_SALES;

        _orderIdCounter.increment();

        ERC721(collectionAddress).safeTransferFrom(
            _msgSender(),
            address(this),
            tokenId
        );

        // Calculate market fee
        uint256 marketFee = CommonLib.calculateSystemFee(
            _order.price,
            feeRate,
            ZOOM
        );
        emit NFTPutOnSales(
            orderId,
            _order.tokenId,
            _order.price,
            _order.currency,
            _order.owner,
            _order.collectionAddress,
            marketFee,
            _order.status
        );
    }

    function cancelListing(uint256 orderId)
        external
        override
        whenNotPaused
        nonReentrant
    {
        Order storage _order = orders[orderId];

        require(_msgSender() == _order.owner, "Order's seller is required");

        //return nft to owner address
        ERC721(_order.collectionAddress).transferFrom(
            address(this),
            _order.owner,
            _order.tokenId
        );

        // Delete order from order list
        delete orders[orderId];

        emit NFTCancelSales(orderId);
    }

    function buyNFT(uint256 orderId) external payable override {
        Order storage _order = orders[orderId];

        require(_order.status == OrderStatus.ON_SALES, "Sales unavailable");
        require(_msgSender() != _order.owner, "Buying owned NFT");

        (uint256 _marketFee, uint256 _totalPaidAmount) = _calculateOrderFees(
            _order,
            ZOOM,
            feeRate
        );

        // Calculate total fee charged
        uint256 _totalFeeCharged = _marketFee;

        (bool success, uint256 amountPaidToSeller) = _order.price.trySub(
            _totalFeeCharged
        );
        require(success);

        // mark the order as completed and set _tokenFromCollectionIsOnSales flag to false
        _order.status = OrderStatus.COMPLETED;

        // Transfer fund to contract
        CommonLib.safeTransfer(
            _order.currency,
            _msgSender(),
            address(this),
            _totalPaidAmount
        );
        // Transfer market fee to fee wallet
        CommonLib.safeTransfer(
            _order.currency,
            address(this),
            feeReceiver,
            _marketFee
        );
        // Transfer remaining amount to seller after deducting market fee and royalty fee
        CommonLib.safeTransfer(
            _order.currency,
            address(this),
            _order.owner,
            amountPaidToSeller
        );

        ERC721(_order.collectionAddress).safeTransferFrom(
            address(this),
            _msgSender(),
            _order.tokenId
        );

        emit NFTBought(
            orderId,
            _order.tokenId,
            amountPaidToSeller,
            _marketFee,
            block.timestamp,
            _order.currency,
            _order.collectionAddress,
            _msgSender(),
            _order.status
        );
    }

    function setFeeRateAndZoom(uint256 _feeRate, uint256 _zoom) external {
        require(_feeRate > 0, "Fee rate must be greater than zero");
        require(_zoom > 0, "Zoom must be greater than zero");
        feeRate = _feeRate;
        ZOOM = _zoom;
    }

    function setWhitelistCollection(address collectionAddress, bool isWhitelist)
        external
        onlyOwner
    {
        require(
            collectionAddress.isContract() || collectionAddress == address(0),
            "Collection address is invalid"
        );

        _whitelistCollections[collectionAddress] = isWhitelist;
        emit WhitelistCollection(collectionAddress, isWhitelist);
    }

    function setWhitelistCurrency(address currency, bool isWhitelist)
        external
        onlyOwner
    {
        require(
            currency.isContract() || currency == address(0),
            "Collection address is invalid"
        );

        _whiteListCurrency[currency] = isWhitelist;
        emit WhiteListCurrency(currency, isWhitelist);
    }

    // <=================================== isOperator ===================================>

    function isOperator(address operator) external view returns (bool) {
        return _operators[operator];
    }

    // <=================================== isAdmin ===================================>

    function isAdmin(address admin) external view returns (bool) {
        return _admins[admin];
    }

    // <=================================== isWhitelistCurrency ===================================>

    function isWhitelistCollection(address collectionAddress)
        external
        view
        returns (bool)
    {
        return _isWhitelistCollection(collectionAddress);
    }

    function isWhitelistCurrency(address currency)
        external
        view
        returns (bool)
    {
        return _isWhitelistCurrency(currency);
    }

    // <=================================== setOperator ===================================>

    function setOperator(address operator, bool isOperator_) public onlyOwner {
        _operators[operator] = isOperator_;
        emit Operator(operator, isOperator_);
    }

    // <=================================== setAdmin ===================================>

    function setAdmin(address admin, bool isAdmin_) external onlyOwner {
        _admins[admin] = isAdmin_;
        emit Admin(admin, isAdmin_);
    }

    function _calculateOrderFees(
        Order memory order,
        uint256 zoom,
        uint256 marketFeeRate
    ) internal pure returns (uint256 marketFee, uint256 totalPaidAmount) {
        // Buying ERC-721 token, single copy only
        totalPaidAmount = order.price;

        // Calculate market fee
        marketFee = CommonLib.calculateSystemFee(
            order.price,
            marketFeeRate,
            zoom
        );
    }

    function _isWhitelistCollection(address _collectionAddress)
        internal
        view
        returns (bool)
    {
        return _whitelistCollections[_collectionAddress];
    }

    function _isWhitelistCurrency(address currency)
        internal
        view
        returns (bool)
    {
        return _whiteListCurrency[currency];
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
