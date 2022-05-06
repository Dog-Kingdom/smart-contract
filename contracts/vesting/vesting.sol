// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "../utils/ArrayLib.sol";
import "hardhat/console.sol";

contract Vesting is
    UUPSUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using AddressUpgradeable for address;
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using CountersUpgradeable for CountersUpgradeable.Counter;

    CountersUpgradeable.Counter private _vestingIds;
    CountersUpgradeable.Counter private _schemeIds;
    CountersUpgradeable.Counter private _roundsId;

    enum VestingStatus {
        INACTIVE,
        ACTIVE,
        COMPLETED
    }

    struct VestingInformation {
        address wallet;
        uint256 schemeId;
        uint256 startTime;
        uint256 endTime;
        uint256 totalAmount;
        uint256 vestedAmount;
        uint256 claimedAmount;
        uint256 roundClaimed;
        uint256 phaseClaimed;
        VestingStatus status;
    }

    struct SchemeInformation {
        string name;
        uint256 vestTime;
        bool canUpdate;
        Round[] rounds;
    }

    struct Round {
        uint256 cliffTime;
        uint256 percents;
        uint256 totalPhase;
        uint256 zoom;
        bool isEffected;
    }

    struct VestingInput {
        address wallet;
        uint256 schemeId;
        uint256 startTime;
        uint256 totalAmount;
        uint256 vestedAmount;
    }

    function initialize(address _erc20Token, address _preventiveWallet)
        public
        initializer
    {
        __UUPSUpgradeable_init();
        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        erc20Token = IERC20Upgradeable(_erc20Token);
        preventiveWallet = _preventiveWallet;
        _operators[msg.sender] = true;
        ZOOM = 1000;
    }

    // @dev create vesting event
    event NewVesting(
        address wallet,
        uint256 vestingBcId,
        uint256 schemeBcId,
        uint256 totalAmount,
        uint256 vestedAmount,
        uint256 startTime,
        uint256 endTime,
        uint256 claimedAmount,
        uint256 roundClaimed,
        uint256 phaseClaimed,
        VestingStatus status
    );

    // @dev create scheme event
    event NewScheme(
        string name,
        uint256 schemeBcId,
        uint256 vestTime,
        bool canUpdate,
        bool hasTGE,
        Round[] rounds
    );

    event UpdateScheme(
        string name,
        uint256 schemeBcId,
        uint256 vestTime,
        bool canUpdate,
        bool hasTGE,
        Round[] rounds
    );

    event UpdateVesting(
        address wallet,
        uint256 vestingBcId,
        uint256 schemeBcId,
        uint256 totalAmount,
        uint256 vestedAmount,
        uint256 startTime,
        uint256 endTime,
        uint256 claimedAmount,
        uint256 roundClaimed,
        uint256 phaseClaimed,
        VestingStatus status
    );

    event Claim(
        address wallet,
        uint256 amount,
        uint256[] roundClaimed,
        uint256[] phaseClaimed,
        uint256[] vestingIds,
        uint256[] amounts
    );
    event EmergencyWithdraw(address preventiveWallet, uint256 amount);
    event PreventiveWallet(address preventiveWallet);
    event CancelVesting(uint256 vestingId);
    event Operator(address operator, bool isOperator);
    event AddRound(
        uint256 roundId,
        uint256 cliffTime,
        uint256 percents,
        uint256 totalPhase
    );
    event Erc20Token(address erc20Token);
    event SetZoom(uint32 zoom);

    IERC20Upgradeable public erc20Token;
    address preventiveWallet;
    mapping(address => bool) _operators;
    address[] public listOperators;
    // @dev get vestingInformation by index
    mapping(uint256 => VestingInformation) vestingInfors;
    // @dev get vestingInformations list by wallet
    mapping(address => uint256[]) walletToVestingInfor;
    // @dev get schemeInfo by index
    mapping(uint256 => SchemeInformation) schemeInfos;

    uint32 public ZOOM;

    modifier onlyOperator() {
        require(_operators[_msgSender()], "Vesting: Sender is not operator");
        _;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function emergencyWithdraw() public whenPaused {
        uint256 balanceOfThis = erc20Token.balanceOf(address(this));
        erc20Token.transfer(preventiveWallet, balanceOfThis);
        emit EmergencyWithdraw(preventiveWallet, balanceOfThis);
    }

    function newScheme(
        string memory name,
        uint256 vestTime,
        Round[] memory _rounds,
        bool hasTGE
    ) external onlyOperator {
        _validateScheme(name, vestTime);
        _schemeIds.increment();
        uint256 id = _schemeIds.current();

        SchemeInformation storage schemeInfo = schemeInfos[id];
        schemeInfo.name = name;
        schemeInfo.vestTime = vestTime;
        schemeInfo.canUpdate = true;

        _addRounds(id, _rounds);

        emit NewScheme(
            schemeInfo.name,
            id,
            schemeInfo.vestTime,
            schemeInfo.canUpdate,
            hasTGE,
            schemeInfo.rounds
        );
    }

    function updateScheme(
        uint256 schemeId,
        string memory name,
        uint256 vestTime,
        Round[] memory _rounds,
        bool hasTGE
    ) external onlyOperator {
        require(_existScheme(schemeId), "Scheme not found");

        _validateScheme(name, vestTime);

        SchemeInformation storage schemeInfo = schemeInfos[schemeId];
        require(schemeInfo.canUpdate, "Scheme was set to vesting event");
        schemeInfo.name = name;
        schemeInfo.vestTime = vestTime;
        delete schemeInfo.rounds;
        _addRounds(schemeId, _rounds);

        emit UpdateScheme(
            schemeInfo.name,
            schemeId,
            schemeInfo.vestTime,
            schemeInfo.canUpdate,
            hasTGE,
            schemeInfo.rounds
        );
    }

    function newVesting(VestingInput memory vestingInput) public onlyOperator {
        require(_existScheme(vestingInput.schemeId), "scheme not found");
        require(vestingInput.wallet != address(0), "wallet invalid");
        require(
            vestingInput.startTime > block.timestamp,
            "startTime must be greater than block.timestamp"
        );
        require(
            vestingInput.totalAmount > 0,
            "totalAmount must be greater than 0"
        );
        require(
            vestingInput.totalAmount > vestingInput.vestedAmount,
            "totalAmount invalid"
        );

        SchemeInformation storage schemeInfo = schemeInfos[
            vestingInput.schemeId
        ];

        _vestingIds.increment();
        VestingInformation storage vestingInfo = vestingInfors[
            _vestingIds.current()
        ];

        walletToVestingInfor[vestingInput.wallet].push(_vestingIds.current());
        vestingInfo.totalAmount =
            vestingInput.totalAmount -
            vestingInput.vestedAmount;
        vestingInfo.wallet = vestingInput.wallet;
        vestingInfo.schemeId = vestingInput.schemeId;
        // @dev get duration of cliff time

        vestingInfo.startTime = vestingInput.startTime;
        vestingInfo.endTime = _computeEndTime(
            schemeInfo.rounds,
            vestingInput.startTime
        );
        vestingInfo.vestedAmount = vestingInput.vestedAmount;
        vestingInfo.roundClaimed = 0;
        vestingInfo.phaseClaimed = 0;
        vestingInfo.claimedAmount = 0;
        _activeVesting(vestingInfo.totalAmount, _vestingIds.current());
        schemeInfo.canUpdate = false;
        emit NewVesting(
            vestingInfo.wallet,
            _vestingIds.current(),
            vestingInfo.schemeId,
            vestingInfo.totalAmount,
            vestingInfo.vestedAmount,
            vestingInfo.startTime,
            vestingInfo.endTime,
            vestingInfo.claimedAmount,
            vestingInfo.roundClaimed,
            vestingInfo.phaseClaimed,
            vestingInfo.status
        );
    }

    function updateVesting(uint256 vestingId, VestingInput memory vestingInput)
        external
        onlyOperator
    {
        require(_existVesting(vestingId), "vesting not found");
        require(_existScheme(vestingInput.schemeId), "scheme not found");
        require(vestingInput.wallet != address(0), "wallet invalid");
        require(
            vestingInput.startTime > block.timestamp,
            "startTime must be greater than block.timestamp"
        );
        require(
            vestingInput.totalAmount > 0,
            "totalAmount must be greater than 0"
        );
        require(
            vestingInput.totalAmount > vestingInput.vestedAmount,
            "totalAmount invalid"
        );

        SchemeInformation storage schemeInfo = schemeInfos[
            vestingInput.schemeId
        ];

        VestingInformation storage vestingInfo = vestingInfors[vestingId];
        require(
            vestingInfo.startTime > block.timestamp,
            "This vesting event had already begun"
        );

        (bool isExist, uint256 index) = ArrayLib.checkExists(
            walletToVestingInfor[vestingInput.wallet],
            vestingId
        );
        if (isExist) {
            ArrayLib.remove(walletToVestingInfor[vestingInput.wallet], index);
        }

        walletToVestingInfor[vestingInput.wallet].push(vestingId);

        uint256 oldTotalAmount = vestingInfo.totalAmount;

        vestingInfo.totalAmount =
            vestingInput.totalAmount -
            vestingInput.vestedAmount;
        vestingInfo.wallet = vestingInput.wallet;
        vestingInfo.schemeId = vestingInput.schemeId;
        vestingInfo.startTime = vestingInput.startTime;
        vestingInfo.endTime = _computeEndTime(
            schemeInfo.rounds,
            vestingInput.startTime
        );
        vestingInfo.vestedAmount = vestingInput.vestedAmount;
        vestingInfo.roundClaimed = 0;
        vestingInfo.phaseClaimed = 0;
        vestingInfo.claimedAmount = 0;

        uint256 amountDeposit = 0;

        if (oldTotalAmount > vestingInfo.totalAmount) {
            amountDeposit = oldTotalAmount - vestingInfo.totalAmount;
            IERC20Upgradeable(erc20Token).safeTransfer(
                msg.sender,
                amountDeposit
            );
        } else if (oldTotalAmount < vestingInfo.totalAmount) {
            amountDeposit = vestingInfo.totalAmount - oldTotalAmount;
            _activeVesting(amountDeposit, _vestingIds.current());
        }

        schemeInfo.canUpdate = false;
        emit UpdateVesting(
            vestingInfo.wallet,
            vestingId,
            vestingInfo.schemeId,
            vestingInfo.totalAmount,
            vestingInfo.vestedAmount,
            vestingInfo.startTime,
            vestingInfo.endTime,
            vestingInfo.claimedAmount,
            vestingInfo.roundClaimed,
            vestingInfo.phaseClaimed,
            vestingInfo.status
        );
    }

    function newVestings(VestingInput[] memory vestingInfo)
        external
        onlyOperator
    {
        for (uint256 i = 0; i < vestingInfo.length; i++) {
            newVesting(vestingInfo[i]);
        }
    }

    function cancelVesting(uint256 _vestingId) external onlyOperator {
        require(_existVesting(_vestingId), "vesting not found");
        VestingInformation storage vesting = vestingInfors[_vestingId];
        if (
            vesting.status == VestingStatus.INACTIVE ||
            vesting.status == VestingStatus.COMPLETED
        ) {
            revert("can't cancel vesting right now");
        }
        vesting.status = VestingStatus.INACTIVE;

        emit CancelVesting(_vestingId);
    }

    function claim(uint256[] memory _vestingIdsList) external nonReentrant {
        require(!msg.sender.isContract(), "caller-invalid");
        uint256 claimable = 0;
        uint256 countVestId = 0;

        for (uint256 i = 0; i < _vestingIdsList.length; i++) {
            if(_isClaimableVesting(_vestingIdsList[i])) {
                countVestId++;
            }
        }
        uint256[] memory vestIdsList = new uint256[](countVestId);
        uint256[] memory amounts = new uint256[](countVestId);
        uint256[] memory roundClaimed = new uint256[](countVestId);
        uint256[] memory phaseClaimed = new uint256[](countVestId);
        uint256 count = 0;
        for (uint256 i = 0; i < _vestingIdsList.length; i++) {
            VestingInformation storage vestingInfo = vestingInfors[
                _vestingIdsList[i]
            ];

            if (_isClaimableVesting(_vestingIdsList[i])) {
                (
                    uint256 availableAmount,
                    uint256 _roundClaimed,
                    uint256 _phaseClaimed
                ) = _computeClaimable(_vestingIdsList[i]);
                claimable = claimable + availableAmount;

                vestingInfo.claimedAmount =
                    vestingInfo.claimedAmount +
                    claimable;
                vestingInfo.roundClaimed = _roundClaimed;
                vestingInfo.phaseClaimed = _phaseClaimed;
                vestIdsList[count] = _vestingIdsList[i];
                amounts[count] = availableAmount;
                roundClaimed[count] = _roundClaimed;
                phaseClaimed[count] = _phaseClaimed;
                count++;
            }
            if (vestingInfo.claimedAmount == vestingInfo.totalAmount) {
                vestingInfo.status = VestingStatus.COMPLETED;
            }
        }
        require(
            IERC20Upgradeable(erc20Token).balanceOf(address(this)) >= claimable,
            "contract dont have enough token"
        );
        if (claimable != 0) {
            IERC20Upgradeable(erc20Token).transfer(msg.sender, claimable);
        }

        emit Claim(
            msg.sender,
            claimable,
            roundClaimed,
            phaseClaimed,
            vestIdsList,
            amounts
        );
    }

    function setOperator(address operator, bool isOperator_) public onlyOwner {
        _operators[operator] = isOperator_;
        emit Operator(operator, isOperator_);
    }

    function getSchemeById(uint256 _schemeId)
        external
        view
        returns (SchemeInformation memory schemeInfo)
    {
        require(_existScheme(_schemeId), "Scheme not found");
        schemeInfo = schemeInfos[_schemeId];
        return schemeInfo;
    }

    function getVestingById(uint256 _vestingId)
        external
        view
        returns (
            address wallet,
            uint256 schemeId,
            uint256 startTime,
            uint256 endTime,
            uint256 totalAmount,
            uint256 vestedAmount,
            uint256 claimedAmount,
            uint256 roundClaimed,
            uint256 phaseClaimed,
            VestingStatus status,
            uint256 claimable
        )
    {
        require(_existVesting(_vestingId), "Vesting not found");
        VestingInformation memory vestingInfo = vestingInfors[_vestingId];
        wallet = vestingInfo.wallet;
        schemeId = vestingInfo.schemeId;
        startTime = vestingInfo.startTime;
        endTime = vestingInfo.endTime;
        totalAmount = vestingInfo.totalAmount;
        vestedAmount =vestingInfo.vestedAmount;
        claimedAmount = vestingInfo.claimedAmount;
        roundClaimed = vestingInfo.roundClaimed;
        phaseClaimed = vestingInfo.phaseClaimed;
        status = vestingInfo.status;
        (claimable, , ) = _computeClaimable(_vestingId);
        return (
            wallet,
            schemeId,
            startTime,
            endTime,
            totalAmount,
            vestedAmount,
            claimedAmount,
            roundClaimed,
            phaseClaimed,
            status,
            claimable
        );
    }

    function getVestingByWallet(address wallet)
        external
        view
        returns (uint256[] memory vestingIds)
    {
        require(!wallet.isContract(), "wallet must not be a contract");
        require(wallet == address(0), "wallet must not be empty");
        vestingIds = walletToVestingInfor[wallet];
        return vestingIds;
    }

    function setErc20Token(address _tokenAddress) external {
        require(_tokenAddress.isContract(), "token must be a contract");
        erc20Token = IERC20Upgradeable(_tokenAddress);
        emit Erc20Token(_tokenAddress);
    }

    function setZoom(uint32 _zoom) external {
        require(_zoom > 0, "zoom must be a positive number");
        ZOOM = _zoom;
        emit SetZoom(ZOOM);
    }

    function _activeVesting(uint256 _amount, uint256 _vestingId) internal {
        VestingInformation storage vestingInfo = vestingInfors[_vestingId];
        vestingInfo.status = VestingStatus.ACTIVE;
        IERC20Upgradeable(erc20Token).safeTransferFrom(
            msg.sender,
            address(this),
            _amount
        );
    }

    function _computeClaimable(uint256 _vestingId)
        internal
        view
        returns (
            uint256,
            uint256,
            uint256
        )
    {   
        
        uint256 claimable = 0;
        VestingInformation memory vestingInfo = vestingInfors[_vestingId];
        SchemeInformation memory schemeInfo = schemeInfos[vestingInfo.schemeId];

        uint256 roundClaimed = vestingInfo.roundClaimed;
        uint256 phaseClaimed = vestingInfo.phaseClaimed;
        if (
            block.timestamp < vestingInfo.endTime &&
            block.timestamp > vestingInfo.startTime &&
            vestingInfo.status == VestingStatus.ACTIVE
        ) {
            // case user already claim all token they stake
            if (vestingInfo.claimedAmount == vestingInfo.totalAmount) {
                return (0, vestingInfo.roundClaimed, vestingInfo.phaseClaimed);
            }
            uint256 timeFromStart = vestingInfo.startTime;
            uint256 totalPercent = 0;
            for (
                uint256 j = vestingInfo.roundClaimed;
                j < schemeInfo.rounds.length;
                j++
            ) {
                Round memory round = schemeInfo.rounds[j];
                roundClaimed = j; // lan 1 = 0
                if(roundClaimed != vestingInfo.roundClaimed) { 
                    phaseClaimed = 0;
                }
                for (
                    uint256 i = phaseClaimed + 1;
                    i <= schemeInfo.rounds[roundClaimed].totalPhase;
                    i++
                ) {
                    timeFromStart = timeFromStart + round.cliffTime;
                    // add a month in case current round is not tge or first round
                    if (round.isEffected) {
                        timeFromStart = timeFromStart + _addMonth();
                    }

                    if (timeFromStart > block.timestamp) {
                        break;
                    }

                    totalPercent = totalPercent + round.percents;
                    phaseClaimed++;
                }
                claimable = ((vestingInfo.totalAmount * totalPercent) / ZOOM);
                if(phaseClaimed == 0 && roundClaimed != 0) {
                    roundClaimed = j - 1;
                    phaseClaimed = schemeInfo.rounds[roundClaimed].totalPhase;
                    break;
                }
                if (schemeInfo.rounds[roundClaimed].totalPhase < phaseClaimed) {
                    break;
                }
                
            }
        } else if (block.timestamp >= vestingInfo.endTime) {
            claimable = vestingInfo.totalAmount - vestingInfo.claimedAmount;
        }
        return (claimable, roundClaimed, phaseClaimed);
    }

    function _validateScheme(string memory name, uint256 vestTime)
        internal
        pure
    {
        require(vestTime > 0, "vest-claim-invalid");
        require(bytes(name).length > 0, "scheme-name-invalid");
    }

    function _addMonth() internal pure returns (uint256) {
        return 30 * 24 * 60 * 60;
    }

    // function _addMonthTest() internal pure returns(uint256) {
    //     return 30*24;
    // }

    function _isClaimableVesting(uint256 _vestingId)
        internal
        view
        returns (bool)
    {
        
        if(!_existVesting(_vestingId)) {
            return false;
        }
        VestingInformation memory vestingInfo = vestingInfors[_vestingId];
        (uint256 availableAmount, , ) = _computeClaimable(_vestingId);
        if (
            vestingInfo.status == VestingStatus.ACTIVE &&
            vestingInfo.wallet == _msgSender() &&
            availableAmount > 0
        ) {
            return true;
        }
        return false;
    }

    function _computeEndTime(Round[] memory _roundsData, uint256 _startTime)
        internal
        pure
        returns (uint256)
    {
        uint256 endTime = _startTime;
        for (uint256 i = 0; i < _roundsData.length; i++) {
            Round memory round = _roundsData[i];
            endTime += round.cliffTime + (_addMonth() * (round.totalPhase));
        }
        return endTime;
    }

    function _addRounds(uint256 _schemeId, Round[] memory _roundsData)
        internal
    {
        require(_roundsData.length > 0, "list round data must not be empty");
        require(
            _roundsData.length <= 6,
            "list round data must equal or smaller than 6"
        );
        SchemeInformation storage schema = schemeInfos[_schemeId];
        uint256 percentsCount = 0;
        for (uint256 i = 0; i < _roundsData.length; i++) {
            require(_roundsData[i].percents > 0, "percents-invalid");
            require(_roundsData[i].totalPhase > 0, "total-phase-invalid");
            percentsCount += (_roundsData[i].percents *
                _roundsData[i].totalPhase);
            schema.rounds.push(_roundsData[i]);
        }
        require(percentsCount == ZOOM, "total percent must equal ZOOM");
    }

    function _existScheme(uint256 _schemeId) internal view returns (bool) {
        if (schemeInfos[_schemeId].vestTime > 0) {
            return true;
        }
        return false;
    }

    function _existVesting(uint256 _vestingId) internal view returns (bool) {
        if (vestingInfors[_vestingId].startTime > 0) {
            return true;
        }
        return false;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
