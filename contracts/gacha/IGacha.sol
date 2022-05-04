// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

interface IGacha {
    enum GachaEventStatus {
        PROCESSING,
        ACTIVE,
        CANCEL,
        DELETE
    }

    enum ItemType {
        Token,
        DogNFT,
        EquipmentNFT,
        Box
    }

    struct GachaEvent {
        string name;
        uint256 startTime;
        uint256 endTime;
        GachaEventStatus gachaStatus;
        uint256 totalBoxes;
        uint256 boxDataPushedIntoEvent;
        uint256[] typeBoxes;
        ChildBoxData childBoxData;
        mapping(uint256 => uint256) boxesByType;
        mapping(uint256 => bytes32[]) boxDataPushedByType;
        mapping(address => mapping(uint256 => uint256)) price;
    }

    struct BoxData {
        uint256 typeBox;
        uint256 boxesByType;
        uint256[] totalBoxesByRarity;
        uint256 totalChildBoxesByType;
        address tokenCurrency;
        uint256 price;
        uint256[] amounts;
    }

    struct BoxNft {
        uint256 typeBox;
        bytes32 hashData;
        string cid;
    }

    struct DogNft {
        uint256 strength;
        uint256 speed;
        uint256 stamina;
        uint256 weight;
        bool isPermanentLoyalty;
        string cid;
    }

    struct DKTokens {
        address tokenCurrency;
        uint256 amount;
    }

    struct EquipmentNft {
        uint256 speed;
        uint256 stamina;
        uint256 strength;
        string cid;
    }

    struct ChildBoxData {
        uint256 totalAmount;
        uint256 totalAmountPushed;
        mapping(uint256 => uint256) childBoxesByType;
        mapping(uint256 => DetailChildBox[]) childBoxDataPushedByType;
    }

    struct DetailChildBox {
        uint256 boxType;
        bytes32 hashData;
    }

    event Admin(address admin, bool isAdmin);
    event Operator(address operator, bool isOperator);
    event Box(address boxContract);
    event Dog(address dogContract);
    event Equipment(address equipmentContract);
    event FeeReceiver(address feeReceiver);
    event WhitelistCurrency(address tokenCurrency, bool isWhitelist);
    event NewGachaEvent(
        uint256 eventId,
        string name,
        uint256 startTime,
        uint256 endTime,
        uint256 totalTypeBox,
        uint256 totalBoxes,
        uint256 totalChildBoxes,
        GachaEventStatus status
    );
    event EditGachaEvent(
        uint256 eventId,
        string name,
        uint256 startTime,
        uint256 endTime,
        uint256 totalTypeBox,
        uint256 totalBoxes,
        uint256 totalChildBoxes,
        GachaEventStatus status
    );
    event UpdateEventData(
        uint256 eventId,
        uint256 typeBox,
        uint256 boxesByType,
        uint256 totalChildBoxesByType,
        uint256[] totalBoxesByRarity,
        uint256[] childBoxesByType,
        uint256[] amounts,
        address tokenCurrency,
        uint256 boxPrice
    );
    event AddBoxData(
        uint256 eventId,
        uint256 typeBox,
        uint256 totalBoxesInEvent,
        uint256 boxDataPushedIntoEvent,
        uint256 boxesByType,
        uint256 boxDatasPushedByType,
        bytes32[] boxDatas,
        uint256[] beIds
    );
    event AddChildBoxData(
        uint256 eventId,
        uint256 parentBoxType,
        uint256 totalAmount,
        uint256 childBoxesByType,
        uint256 totalAmountPushed,
        uint256 childBoxType,
        bytes32[] boxesData,
        uint256[] beIds
    );
    event BuyGachaBox(
        uint256 eventId,
        address buyer,
        uint256 boxId,
        uint256 typeBox,
        bytes32 boxData,
        string cid
    );
    event Unbox(
        uint256 boxId,
        address wallet,
        uint256[] tokenIds,
        ItemType giftType,
        uint256 amount,
        address tokenCurrency
    );
    event ChangeStatusGachaEvent(uint256 eventId, GachaEventStatus status);

    function createGachaEvent(
        string memory name,
        uint256 startTime,
        uint256 endTime,
        uint256 totalTypeBox,
        uint256 totalBoxes,
        uint256 totalChildBoxes,
        uint256[] memory childBoxesByType,
        BoxData[] memory boxData
    ) external;

    function editGachaEvent(
        uint256 eventId,
        string memory name,
        uint256 startTime,
        uint256 endTime,
        uint256 totalTypeBox,
        uint256 totalBoxes,
        uint256 totalChildBoxes,
        uint256[] memory childBoxesByType,
        BoxData[] memory boxData
    ) external;

    function addBoxData(
        uint256 eventId,
        uint256 boxType,
        bytes32[] memory boxDatas,
        uint256[] memory beIds
    ) external;

    function addChildBox(
        uint256 eventId,
        uint256 boxType,
        uint256 childBoxType,
        bytes32[] memory boxDatas,
        uint256[] memory beIds
    ) external;

    function buyGachaBox(
        uint256 eventId,
        address tokenCurrency,
        uint256 typeBox,
        uint256[] memory amountChildBoxByType,
        string memory cid
    ) external payable;

    function unbox(
        address wallet,
        bytes memory signature,
        string memory message,
        uint256 boxId,
        ItemType giftType,
        BoxNft[] memory boxNft,
        EquipmentNft memory equipmentNft,
        DogNft memory dogNft,
        DKTokens memory dkToken
    ) external;

    function changeStatusGachaEvent(uint256 eventId, GachaEventStatus status)
        external;
}
