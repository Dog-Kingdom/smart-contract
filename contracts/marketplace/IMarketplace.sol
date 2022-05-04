// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

interface IMarketplace {
    /**************************************  Enum  **************************************/

    enum OrderStatus {
        ON_SALES,
        COMPLETED
    }

    /**************************************  Struct  **************************************/

    struct Order {
        uint256 tokenId;
        uint256 price;
        address currency;
        address owner;
        address collectionAddress;
        OrderStatus status;
    }

    struct Purchase {
        uint256 orderId;
        uint256 tokenId;
        uint256 price;
        uint256 marketFee;
        uint256 timeOfPurchase;
        address currency;
        address collectionAddress;
        address buyer;
        OrderStatus status;
    }

    /**************************************  Event  **************************************/

    event NFTPutOnSales(
        uint256 orderId,
        uint256 tokenId,
        uint256 price,
        address currency,
        address owner,
        address collectionAddress,
        uint256 marketFee,
        OrderStatus orderStatus
    );

    event NFTBought(
        uint256 orderId,
        uint256 tokenId,
        uint256 price,
        uint256 marketFee,
        uint256 timeOfPurchase,
        address currency,
        address collectionAddress,
        address buyer,
        OrderStatus status
    );

    event NFTCancelSales(uint256 orderId);

    event WhitelistCollection(address collectionAddress, bool isWhitelist);

    event WhiteListCurrency(address currency, bool isWhitelist);

    event Admin(address admin, bool isAdmin);

    event Operator(address operator, bool isOperator);

    /**************************************  Function  **************************************/

    function putOnSales(
        uint256 tokenId,
        uint256 price,
        address currency,
        address collectionAddress
    ) external;

    function cancelListing(uint256 orderId) external;

    function buyNFT(uint256 orderId) external payable;
}
