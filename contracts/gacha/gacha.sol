/* SPDX-License-Identifier: MIT */
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../utils/ArrayLib.sol";
import "../erc721/Box.sol";
import "../erc721/Dog.sol";
import "../erc721/Equipment.sol";
import "../erc20/DKToken.sol";
import "../utils/GachaBoxLib.sol";
import "./IGacha.sol";

contract Gacha is
    UUPSUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    IGacha
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using AddressUpgradeable for address;
    using CountersUpgradeable for CountersUpgradeable.Counter;

    CountersUpgradeable.Counter public gachaEventCount;
    address public feeReceiver;
    DogContract public dogContract;
    EquipmentContract public equipmentContract;
    BoxContract public boxContract;

    CountersUpgradeable.Counter private _randLinear;
    mapping(address => bool) private _admins;
    mapping(address => bool) private _operators;
    mapping(address => bool) private _whitelistCurrency;
    mapping(uint256 => GachaEvent) private _gachaEvents;

    address public verichainVRFAddress;
    uint256 constant VERICHAINS_RANDOM_KEY =
        0xc9821440a2c2cc97acac89148ac13927dead00238693487a9c84dfe89e28a284;

    function initialize(
        address feeReceiver_,
        address boxContract_,
        address verichainAddress_
    ) external initializer {
        __UUPSUpgradeable_init();
        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        boxContract = BoxContract(boxContract_);
        feeReceiver = feeReceiver_;
        verichainVRFAddress = verichainAddress_;
    }

    // <=================================== MODIFIERS ===================================>

    modifier onlyOperator() {
        require(_operators[_msgSender()], "DK01");
        _;
    }

    modifier onlyAdmin() {
        require(_admins[_msgSender()], "DK02");
        _;
    }

    modifier gachaEventExist(uint256 eventId) {
        require(eventId > 0 && eventId <= gachaEventCount.current(), "DK03");
        _;
    }

    // <=================================== FUNCTIONS ===================================>

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // <=================================== CREATE GACHA EVENT ===================================/>

    /**
     * @dev create new record of gacha event
     * @param name is name of gacha event
     * @param startTime is moment as timestamp when gacha started
     * @param endTime is moment as timestamp when gacha ended
     * @param totalTypeBox is total amount of type box in event
     * @param totalBoxes is total amount of box in event
     * @param totalChildBoxes is total amount of child box in event include box of Grand Box and Meta Box
     * @param childBoxesByType is an array of child box group by type
     * @param boxData is an array of object that include detail information of boxes group by its type
     */
    function createGachaEvent(
        string memory name,
        uint256 startTime,
        uint256 endTime,
        uint256 totalTypeBox,
        uint256 totalBoxes,
        uint256 totalChildBoxes,
        uint256[] memory childBoxesByType,
        BoxData[] memory boxData
    ) external override onlyAdmin {
        GachaBoxLib._validateGachaEvent(
            name,
            startTime,
            endTime,
            totalTypeBox,
            totalBoxes,
            boxData
        );
        gachaEventCount.increment();
        uint256 id = gachaEventCount.current();
        GachaEvent storage newGachaEvent = _gachaEvents[id];
        newGachaEvent.name = name;
        newGachaEvent.startTime = startTime;
        newGachaEvent.endTime = endTime;
        newGachaEvent.gachaStatus = GachaEventStatus.PROCESSING;
        //init total box
        newGachaEvent.totalBoxes = 0;
        newGachaEvent.boxDataPushedIntoEvent = 0;
        newGachaEvent.childBoxData.totalAmount = 0;
        emit NewGachaEvent(
            id,
            newGachaEvent.name,
            newGachaEvent.startTime,
            newGachaEvent.endTime,
            totalTypeBox,
            totalBoxes,
            totalChildBoxes,
            newGachaEvent.gachaStatus
        );

        _updateBoxDataInEvent(
            id,
            totalBoxes,
            boxData,
            totalChildBoxes,
            childBoxesByType
        );
    }

    // <=================================== EDIT GACHA EVENT ===================================>

    /**
     * @dev overwrite on existing record of gacha event with new information
     * Require: admin role
     * Require: this record must not be generate Box Data
     * @param eventId is id of existing gacha event
     * @param name is name of gacha event
     * @param startTime is moment as timestamp when gacha started
     * @param endTime is moment as timestamp when gacha ended
     * @param totalTypeBox is total amount of type box in event
     * @param totalBoxes is total amount of box in event
     * @param totalChildBoxes is total amount of child box in event include box of Grand Box and Meta Box
     * @param childBoxesByType is an array of child box group by type
     * @param boxData is an array of object that include detail information of boxes group by its type
     */
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
    ) external override onlyAdmin gachaEventExist(eventId) {
        GachaBoxLib._validateGachaEvent(
            name,
            startTime,
            endTime,
            totalTypeBox,
            totalBoxes,
            boxData
        );
        GachaEvent storage gachaEvent = _gachaEvents[eventId];
        require(
            gachaEvent.boxDataPushedIntoEvent == 0 &&
                gachaEvent.childBoxData.totalAmountPushed == 0,
            "DK04"
        );
        gachaEvent.name = name;
        gachaEvent.startTime = startTime;
        gachaEvent.endTime = endTime;
        gachaEvent.gachaStatus = GachaEventStatus.PROCESSING;
        //reset data
        gachaEvent.totalBoxes = 0;
        gachaEvent.boxDataPushedIntoEvent = 0;
        gachaEvent.childBoxData.totalAmount = 0;
        gachaEvent.childBoxData.totalAmountPushed = 0;
        for (uint256 i = 0; i < gachaEvent.typeBoxes.length; i++) {
            uint256 typeBox = gachaEvent.typeBoxes[i];
            gachaEvent.boxesByType[typeBox] = 0;
            if (
                gachaEvent.typeBoxes[i] == uint8(GachaBoxLib.Type.GRAND_BOX) ||
                gachaEvent.typeBoxes[i] == uint8(GachaBoxLib.Type.META_BOX)
            ) {
                gachaEvent.childBoxData.childBoxesByType[typeBox] = 0;
            }
        }

        delete gachaEvent.typeBoxes;

        emit EditGachaEvent(
            eventId,
            gachaEvent.name,
            gachaEvent.startTime,
            gachaEvent.endTime,
            totalTypeBox,
            totalBoxes,
            totalChildBoxes,
            gachaEvent.gachaStatus
        );

        _updateBoxDataInEvent(
            eventId,
            totalBoxes,
            boxData,
            totalChildBoxes,
            childBoxesByType
        );
    }

    // <=================================== ADD BOX DATA ===================================>

    /**
     *  @dev this function just could be call by backend server to push box data into event by each type box
     * Require: operator role
        @param eventId: id of event on chain
        @param boxType: type box will be pushed data by backend server
        @param boxDatas: array box data is generated by backend server
        @param beIds: array id of box data is storaged in backend and mapping with boxDatas
     */
    function addBoxData(
        uint256 eventId,
        uint256 boxType,
        bytes32[] memory boxDatas,
        uint256[] memory beIds
    ) external override onlyOperator gachaEventExist(eventId) {
        require(boxDatas.length > 0, "DK05");
        require(boxDatas.length == beIds.length, "DK06");
        GachaEvent storage gachaEvent = _gachaEvents[eventId];
        (bool isExist, ) = ArrayLib.checkExists(gachaEvent.typeBoxes, boxType);
        require(isExist, "DK07");
        require(gachaEvent.gachaStatus == GachaEventStatus.PROCESSING, "DK08");
        //validate amount boxData.length not exceed total box in event
        require(
            gachaEvent.boxDataPushedIntoEvent + boxDatas.length <=
                gachaEvent.totalBoxes,
            "DK09"
        );
        //validate amount boxData.length not exceed total box of this type in event
        require(
            gachaEvent.boxDataPushedByType[boxType].length + boxDatas.length <=
                gachaEvent.boxesByType[boxType],
            "DK10"
        );
        for (uint256 i = 0; i < boxDatas.length; i++) {
            gachaEvent.boxDataPushedByType[boxType].push(boxDatas[i]);
        }
        gachaEvent.boxDataPushedIntoEvent += boxDatas.length;
        emit AddBoxData(
            eventId,
            boxType,
            gachaEvent.totalBoxes,
            gachaEvent.boxDataPushedIntoEvent,
            gachaEvent.boxesByType[boxType],
            gachaEvent.boxDataPushedByType[boxType].length,
            boxDatas,
            beIds
        );
    }

    // <=================================== ADD CHILD BOX ===================================>

    /**
     * @dev add information of child box to gacha event
     * Require: operator role
     * @param eventId is id of existing gacha event
     * @param boxType is type of parent box
     * @param childBoxType is type of child boxes
     * @param boxDatas is an array of hash data, using information of item inside box and hash algorithm to hash it
     * @param beIds is an array of id represent for box
     */
    function addChildBox(
        uint256 eventId,
        uint256 boxType,
        uint256 childBoxType,
        bytes32[] memory boxDatas,
        uint256[] memory beIds
    ) external override onlyOperator gachaEventExist(eventId) {
        require(boxDatas.length > 0, "DK05");
        require(boxDatas.length == beIds.length, "DK06");
        GachaEvent storage gachaEvent = _gachaEvents[eventId];
        (bool isExist, ) = ArrayLib.checkExists(gachaEvent.typeBoxes, boxType);
        require(isExist, "DK07");
        require(gachaEvent.gachaStatus == GachaEventStatus.PROCESSING, "DK08");
        require(
            gachaEvent.childBoxData.totalAmountPushed + boxDatas.length <=
                gachaEvent.childBoxData.totalAmount,
            "DK11"
        );
        require(
            gachaEvent.childBoxData.childBoxDataPushedByType[boxType].length +
                boxDatas.length <=
                gachaEvent.childBoxData.childBoxesByType[boxType],
            "DK12"
        );
        for (uint256 i = 0; i < boxDatas.length; i++) {
            gachaEvent.childBoxData.childBoxDataPushedByType[boxType].push(
                DetailChildBox(childBoxType, boxDatas[i])
            );
        }
        gachaEvent.childBoxData.totalAmountPushed += boxDatas.length;

        emit AddChildBoxData(
            eventId,
            boxType,
            gachaEvent.childBoxData.totalAmount,
            gachaEvent.childBoxData.childBoxesByType[boxType],
            gachaEvent.childBoxData.totalAmountPushed,
            childBoxType,
            boxDatas,
            beIds
        );
    }

    // <=================================== BUY GACHA BOX ===================================>
    /**
     * @dev update quantity box in gacha event and then mint box nft to user
     * @param eventId is id of existing gacha event
     * @param tokenCurrency is address of token
     * @param typeBox is type of gacha box
     * @param amountChildBoxByType is an array of amounts child boxes group by its type
     * @param cid is contend identifier
     */
    function buyGachaBox(
        uint256 eventId,
        address tokenCurrency,
        uint256 typeBox,
        uint256[] memory amountChildBoxByType,
        string memory cid
    )
        external
        payable
        override
        whenNotPaused
        gachaEventExist(eventId)
        nonReentrant
    {
        require(_msgSender() == tx.origin, "DK13");
        require(feeReceiver != address(0), "DK14");
        require(_isWhitelistCurrency(tokenCurrency), "DK15");
        GachaEvent storage gachaEvent = _gachaEvents[eventId];
        (bool isExist, ) = ArrayLib.checkExists(gachaEvent.typeBoxes, typeBox);
        require(isExist, "DK07");
        require(gachaEvent.startTime <= block.timestamp, "DK16");
        require(block.timestamp <= gachaEvent.endTime, "DK17");
        require(gachaEvent.gachaStatus == GachaEventStatus.ACTIVE, "DK18");
        require(gachaEvent.boxDataPushedIntoEvent > 0, "DK19");
        require(gachaEvent.boxesByType[typeBox] > 0, "DK20");
        require(
            gachaEvent.totalBoxes == gachaEvent.boxDataPushedIntoEvent,
            "DK21"
        );
        uint256 boxPrice = gachaEvent.price[tokenCurrency][typeBox];
        require(boxPrice > 0, "DK22");

        if (
            amountChildBoxByType.length > 0 && amountChildBoxByType.length == 3
        ) {
            _handleBuyChildBox(eventId, typeBox, amountChildBoxByType);
        }

        // require(false, "before `get random number` checked");

        uint256 indexBoxData = GachaBoxLib._random(
            gachaEvent.boxesByType[typeBox],
            VERICHAINS_RANDOM_KEY,
            verichainVRFAddress
        );

        bytes32 boxData = gachaEvent.boxDataPushedByType[typeBox][indexBoxData];

        uint256 boxId = boxContract.mint(_msgSender(), typeBox, boxData, cid);

        //decrease amount box in event
        gachaEvent.totalBoxes--;
        gachaEvent.boxDataPushedIntoEvent--;
        gachaEvent.boxesByType[typeBox]--;
        ArrayLib.remove(gachaEvent.boxDataPushedByType[typeBox], indexBoxData);

        //payment gacha box
        GachaBoxLib._payment(
            tokenCurrency,
            boxPrice,
            _msgSender(),
            feeReceiver
        );
        emit BuyGachaBox(eventId, _msgSender(), boxId, typeBox, boxData, cid);
    }

    // <=================================== UNBOX ===================================>

    /**
     * @dev verify and move item in box to user as an nft and then burn this box nft
     * Require: operator role
     * @param wallet is address of the owner
     * @param signature is digital signature
     * @param message is string of data that user signed to
     * @param boxId is token id of box
     * @param giftType is an enum to check that item in box is `Equipment` or `Dog` or `Token` or `Box`
     * @param boxNft is an object of boxNft include its stats and needed information to mint
     * @param equipmentNft is an object of equipmentNft include its stats and needed information to mint
     * @param dogNft is an object of dogNft include its stats and needed information to mint
     * @param dkToken is an object of dkToken include its token address and amount of token
     */
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
    ) external override onlyOperator {
        bytes32 messageHash = keccak256(abi.encodePacked(message));
        address walletSigner = GachaBoxLib._recoverSigner(
            messageHash,
            signature
        );

        require(wallet == walletSigner, "DK23");
        require(boxContract.ownerOf(boxId) == wallet, "DK24");

        uint256[] memory tokenIds = _unboxDetail(
            wallet,
            boxId,
            giftType,
            boxNft,
            equipmentNft,
            dogNft,
            dkToken
        );
        // burn box
        boxContract.burn(boxId);

        emit Unbox(
            boxId,
            wallet,
            tokenIds,
            giftType,
            dkToken.amount,
            dkToken.tokenCurrency
        );
    }

    // <=================================== changeStatusGachaEvent ===================================>

    function changeStatusGachaEvent(uint256 eventId, GachaEventStatus status)
        external
        override
        onlyAdmin
        gachaEventExist(eventId)
    {
        require(status <= GachaEventStatus.CANCEL, "DK25");
        GachaEvent storage gacha = _gachaEvents[eventId];
        if (gacha.gachaStatus == GachaEventStatus.CANCEL) {
            revert("DK26");
        }
        require(
            gacha.totalBoxes == gacha.boxDataPushedIntoEvent &&
                gacha.childBoxData.totalAmount ==
                gacha.childBoxData.totalAmountPushed,
            "DK27"
        );
        gacha.gachaStatus = status;
        emit ChangeStatusGachaEvent(eventId, gacha.gachaStatus);
    }

    // <=================================== setWhitelistCurrency ===================================>

    function setWhitelistCurrency(address tokenCurrency, bool isWhitelist)
        external
        onlyOwner
    {
        require(
            tokenCurrency.isContract() || tokenCurrency == address(0),
            "DK28"
        );
        _whitelistCurrency[tokenCurrency] = isWhitelist;
        emit WhitelistCurrency(tokenCurrency, isWhitelist);
    }

    // <=================================== setFeeReceiver ===================================>

    function setFeeReceiver(address newFeeReceiver) external onlyOwner {
        require(newFeeReceiver != address(0), "DK29");
        feeReceiver = newFeeReceiver;
        emit FeeReceiver(feeReceiver);
    }

    // <=================================== setBoxContract ===================================>

    function setBoxContract(address newBoxContract) external onlyOwner {
        require(
            newBoxContract.isContract() && newBoxContract != address(0),
            "DK30"
        );
        boxContract = BoxContract(newBoxContract);
        emit Box(newBoxContract);
    }

    // <=================================== setDogContract ===================================>

    function setDogContract(address newDogContract) external onlyOwner {
        require(
            newDogContract.isContract() && newDogContract != address(0),
            "DK31"
        );
        dogContract = DogContract(newDogContract);
        emit Dog(newDogContract);
    }

    // <=================================== setEquipmentContract ===================================>

    function setEquipmentContract(address newEquipmentContract)
        external
        onlyOwner
    {
        require(
            newEquipmentContract.isContract() &&
                newEquipmentContract != address(0),
            "DK32"
        );
        equipmentContract = EquipmentContract(newEquipmentContract);
        emit Equipment(newEquipmentContract);
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

    // <=================================== gachaEventInformation ===================================>

    function gachaEventInformation(uint256 eventId, uint256 typeBox)
        external
        view
        returns (
            string memory name,
            uint256 startTime,
            uint256 endTime,
            uint256[] memory typeBoxes,
            uint256 totalBoxes,
            uint256 boxDataPushedIntoEvent,
            uint256 totalChildBoxes,
            uint256 totalChildBoxesPushed,
            uint256 boxesByType,
            bytes32[] memory boxDataPushedByType,
            GachaEventStatus _status
        )
    {
        GachaEvent storage gacha = _gachaEvents[eventId];
        name = gacha.name;
        startTime = gacha.startTime;
        endTime = gacha.endTime;
        totalBoxes = gacha.totalBoxes;
        typeBoxes = gacha.typeBoxes;
        boxDataPushedIntoEvent = gacha.boxDataPushedIntoEvent;
        totalChildBoxes = gacha.childBoxData.totalAmount;
        totalChildBoxesPushed = gacha.childBoxData.totalAmountPushed;
        boxesByType = gacha.boxesByType[typeBox];
        boxDataPushedByType = gacha.boxDataPushedByType[typeBox];
        _status = gacha.gachaStatus;
    }

    // <=================================== boxDataDetailInEvent ===================================>

    function boxDataDetailInEvent(uint256 eventId, uint256 typeBox)
        external
        view
        returns (uint256 boxesByType, bytes32[] memory boxDatas)
    {
        GachaEvent storage gacha = _gachaEvents[eventId];
        boxesByType = gacha.boxesByType[typeBox];
        boxDatas = gacha.boxDataPushedByType[typeBox];
    }

    // <=================================== getBoxPrice ===================================>

    function getBoxPrice(
        uint256 eventId,
        address tokenCurrency,
        uint256 typeBox
    ) external view returns (uint256) {
        require(_isWhitelistCurrency(tokenCurrency), "DK15");
        return _gachaEvents[eventId].price[tokenCurrency][typeBox];
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

    function isWhitelistCurrency(address tokenCurrency)
        external
        view
        returns (bool)
    {
        return _isWhitelistCurrency(tokenCurrency);
    }

    function setVerichainAddress(address verichainVRFAddress_)
        external
        onlyOwner
    {
        require(
            verichainVRFAddress_.isContract(),
            "verichain address must be a contract"
        );
        verichainVRFAddress = verichainVRFAddress_;
    }

    // <=================================== INTERNAL FUNCTION ===================================>

    function _isWhitelistCurrency(address _tokenCurrency)
        internal
        view
        returns (bool)
    {
        return _whitelistCurrency[_tokenCurrency];
    }

    function _updateBoxDataInEvent(
        uint256 eventId,
        uint256 totalBoxesAdding,
        BoxData[] memory boxData,
        uint256 totalChildBoxes,
        uint256[] memory childBoxesByType
    ) internal {
        GachaEvent storage gachaEvent = _gachaEvents[eventId];
        // init variable totalBoxesAddingByType for checking data with totalBoxesAdding
        uint256 totalBoxesAddingByType = 0;
        uint256 totalChildBoxesAddingByType = 0;
        uint256 grandChildBoxes = 0;
        uint256 metaChildBoxes = 0;

        require(
            childBoxesByType.length == 5,
            "child boxes by type must have 5 elements"
        );

        //get total child boxes split by parent box's type
        for (uint256 i = 0; i < childBoxesByType.length; i++) {
            if (i < 3) {
                grandChildBoxes += childBoxesByType[i];
            } else {
                metaChildBoxes += childBoxesByType[i];
            }
        }
        for (uint256 i = 0; i < boxData.length; i++) {
            BoxData memory _boxData = boxData[i];
            require(
                _boxData.totalBoxesByRarity.length == 10,
                "DK33"
                //Total boxes by rarity list must have ten elements
            );
            require(
                childBoxesByType.length == 5,
                "DK34"
                //Child boxes by type length != 5
            );

            require(_isWhitelistCurrency(_boxData.tokenCurrency), "DK15");

            uint256 typeBox = _boxData.typeBox;
            (bool isExist, ) = ArrayLib.checkExists(
                gachaEvent.typeBoxes,
                typeBox
            );
            if (!isExist) {
                gachaEvent.typeBoxes.push(typeBox);
            }

            if (_boxData.boxesByType > 0) {
                //update total box adding by type in event
                //update total box adding by type for variable checking
                totalBoxesAddingByType += _boxData.boxesByType;
                totalChildBoxesAddingByType += _boxData.totalChildBoxesByType;
                //check sum of totalBoxesByRarity list equal _boxData.boxesByType
                // init variable total box by rarity for checking
                uint256 totalBoxesByRarity = 0;

                for (
                    uint256 j = 0;
                    j < _boxData.totalBoxesByRarity.length;
                    j++
                ) {
                    totalBoxesByRarity += _boxData.totalBoxesByRarity[j];
                }
                require(
                    totalBoxesByRarity == _boxData.boxesByType,
                    "DK35"
                    //Total boxes by rarity must be equal boxes by type
                );
                if (
                    _boxData.typeBox == uint8(GachaBoxLib.Type.GRAND_BOX) &&
                    (_boxData.totalChildBoxesByType != grandChildBoxes)
                ) {
                    revert("DK36");
                    //total child box by grand type != grand child boxes
                } else if (
                    _boxData.typeBox == uint8(GachaBoxLib.Type.META_BOX) &&
                    (_boxData.totalChildBoxesByType != metaChildBoxes)
                ) {
                    revert("DK37");
                    //total child box by meta type != meta child boxes
                }
                if (_boxData.typeBox == uint8(GachaBoxLib.Type.EPIC_DOG_BOX)) {
                    gachaEvent.boxesByType[typeBox] += (_boxData.boxesByType -
                        childBoxesByType[0]);
                } else if (
                    _boxData.typeBox == uint8(GachaBoxLib.Type.PREMIUM_DOG_BOX)
                ) {
                    gachaEvent.boxesByType[typeBox] += (_boxData.boxesByType -
                        childBoxesByType[3]);
                } else if (
                    _boxData.typeBox ==
                    uint8(GachaBoxLib.Type.EPIC_EQUIPMENT_BOX)
                ) {
                    gachaEvent.boxesByType[typeBox] += (_boxData.boxesByType -
                        childBoxesByType[1]);
                } else if (
                    _boxData.typeBox ==
                    uint8(GachaBoxLib.Type.PREMIUM_EQUIPMENT_BOX)
                ) {
                    gachaEvent.boxesByType[typeBox] += (_boxData.boxesByType -
                        childBoxesByType[4]);
                } else if (
                    _boxData.typeBox == uint8(GachaBoxLib.Type.LUCKY_BOX)
                ) {
                    gachaEvent.boxesByType[typeBox] += (_boxData.boxesByType -
                        childBoxesByType[2]);
                } else {
                    gachaEvent.boxesByType[typeBox] += _boxData.boxesByType;
                }
                gachaEvent.childBoxData.childBoxesByType[typeBox] += _boxData
                    .totalChildBoxesByType;
            }

            if (gachaEvent.boxesByType[typeBox] > 0) {
                require(
                    _boxData.price > 0,
                    "DK38"
                    //Box price < 0
                );
            }

            _setGachaBoxPrice(
                eventId,
                _boxData.tokenCurrency,
                typeBox,
                _boxData.price
            );

            emit UpdateEventData(
                eventId,
                typeBox,
                _boxData.boxesByType,
                _boxData.totalChildBoxesByType,
                _boxData.totalBoxesByRarity,
                childBoxesByType,
                _boxData.amounts,
                _boxData.tokenCurrency,
                _boxData.price
            );
        }

        gachaEvent.totalBoxes += (totalBoxesAdding - totalChildBoxes);
        gachaEvent.childBoxData.totalAmount += totalChildBoxes;
        require(
            totalChildBoxesAddingByType == totalChildBoxes,
            "DK39"
            //Total child boxes adding by type != total child boxes
        );
        require(
            totalBoxesAddingByType == totalBoxesAdding,
            "DK40"
            //Total boxes by type must be equal total boxes
        );
    }

    function _setGachaBoxPrice(
        uint256 eventId,
        address tokenCurrency,
        uint256 typeBox,
        uint256 price
    ) internal {
        _gachaEvents[eventId].price[tokenCurrency][typeBox] = price;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function _unboxDetail(
        address wallet,
        uint256 boxId,
        ItemType giftType,
        BoxNft[] memory boxNft,
        EquipmentNft memory equipmentNft,
        DogNft memory dogNft,
        DKTokens memory dkToken
    ) internal returns (uint256[] memory) {
        uint256[] memory tokenIds;
        bytes32 hashData;
        if (giftType == ItemType.Box) {
            hashData = keccak256(
                abi.encodePacked(boxNft[0].typeBox, boxNft[0].hashData)
            );
            (, bytes32 boxData) = boxContract.boxInformation(boxId);
            require(hashData == boxData, "DK41");
            tokenIds = new uint256[](boxNft.length - 1);
            for (uint256 i = 0; i < tokenIds.length; i++) {
                // create box
                tokenIds[i] = boxContract.mint(
                    wallet,
                    boxNft[i + 1].typeBox,
                    boxNft[i + 1].hashData,
                    boxNft[i + 1].cid
                );
            }
        } else if (giftType == ItemType.DogNFT) {
            hashData = keccak256(
                abi.encodePacked(
                    dogNft.strength,
                    dogNft.speed,
                    dogNft.stamina,
                    dogNft.weight,
                    bytes(dogNft.cid)
                )
            );
            (, bytes32 boxData) = boxContract.boxInformation(boxId);
            require(hashData == boxData, "DK42");
            tokenIds = new uint256[](1);
            // create dog
            tokenIds[0] = dogContract.mint(
                wallet,
                dogNft.strength,
                dogNft.speed,
                dogNft.stamina,
                dogNft.weight,
                dogNft.isPermanentLoyalty,
                dogNft.cid
            );
        } else if (giftType == ItemType.EquipmentNFT) {
            hashData = keccak256(
                abi.encodePacked(
                    equipmentNft.speed,
                    equipmentNft.stamina,
                    equipmentNft.strength,
                    bytes(equipmentNft.cid)
                )
            );
            (, bytes32 boxData) = boxContract.boxInformation(boxId);
            require(hashData == boxData, "DK43");
            // create equipment
            tokenIds = new uint256[](1);
            tokenIds[0] = equipmentContract.mint(
                wallet,
                equipmentNft.speed,
                equipmentNft.stamina,
                equipmentNft.strength,
                equipmentNft.cid
            );
        } else {
            hashData = keccak256(
                abi.encodePacked(dkToken.tokenCurrency, dkToken.amount)
            );
            (, bytes32 boxData) = boxContract.boxInformation(boxId);
            require(hashData == boxData, "DK44");

            // mint token
            DKToken(dkToken.tokenCurrency).mint(wallet, dkToken.amount);
        }
        return tokenIds;
    }

    function _handleBuyChildBox(
        uint256 eventId,
        uint256 typeBox,
        uint256[] memory childBoxByType
    ) internal {
        if (
            typeBox == uint8(GachaBoxLib.Type.GRAND_BOX) ||
            typeBox == uint8(GachaBoxLib.Type.META_BOX)
        ) {
            GachaEvent storage gachaEvent = _gachaEvents[eventId];
            uint256 totalAmount = 0;
            for (uint256 i = 0; i < childBoxByType.length; i++) {
                totalAmount += childBoxByType[i];
            }

            require(
                gachaEvent.childBoxData.childBoxesByType[typeBox] >=
                    totalAmount,
                "DK45"
            ); //amount of child box invalid

            for (uint256 i = 0; i < childBoxByType.length; i++) {
                if (childBoxByType[i] == 0) {
                    continue;
                }
                uint256 indexChildBoxData = GachaBoxLib._random(
                    gachaEvent.childBoxData.childBoxesByType[typeBox],
                    VERICHAINS_RANDOM_KEY,
                    verichainVRFAddress
                );
                GachaBoxLib._remove(
                    gachaEvent.childBoxData.childBoxDataPushedByType[typeBox],
                    indexChildBoxData
                );
                gachaEvent.childBoxData.childBoxesByType[
                    typeBox
                ] -= childBoxByType[i];
            }

            gachaEvent.childBoxData.totalAmount -= totalAmount;
            gachaEvent.childBoxData.totalAmountPushed -= totalAmount;
        }
    }
}
