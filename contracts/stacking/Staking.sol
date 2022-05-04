// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./IStaking.sol";

contract Staking is
    UUPSUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    IStaking
{
    using AddressUpgradeable for address;
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using CountersUpgradeable for CountersUpgradeable.Counter;

    /*----------------------------- EVENT -----------------------------------*/

    event Operator(address operator, bool isOperator);
    event WhiteListCollection(address collection, bool isInWhitelist);
    event WhiteListCurrency(address currency, bool isInWhitelist);

    /*----------------------------- VARIABLES -----------------------------------*/

    uint256 public ZOOM = 100;
    uint256 public SECOND_IN_DAY = 86400;
    uint256 public DAY_IN_YEAR = 365;

    address preventiveWallet;

    mapping(address => Event) _stakingEvents;
    mapping(uint256 => Reward) _rewardEvents;
    mapping(address => bool) _operators;

    /*----------------------------- MODIFIER -----------------------------------*/

    modifier onlyOperator() {
        require(_operators[_msgSender()], "Staking: Sender is not operator");
        _;
    }

    /*----------------------------- INIT -----------------------------------*/

    function initialize(address _preventiveWallet) public initializer {
        __Pausable_init();
        __UUPSUpgradeable_init();
        __Ownable_init();
        __ReentrancyGuard_init();

        preventiveWallet = _preventiveWallet;
        _operators[msg.sender] = true;
    }

    /*----------------------------- FUNCTION -----------------------------------*/

    /* create new stake event
     *
     */
    function newEvent(Event memory _stakeEvent) external onlyOperator {}

    function newReward(Reward memory _reward) external onlyOperator {}

    function newStake(Stake memory _stake)
        external
        nonReentrant
        whenNotPaused
    {}

    function updateEvent(uint256 _eventId, Event memory _stakeEvent)
        external
        onlyOperator
    {}

    function changeStatusEvent(uint256[] memory _eventsId)
        external
        onlyOperator
    {}

    function deleteReward(uint256 _rewardId) external onlyOperator {}

    function withdraw(uint256 _stakeId) external nonReentrant whenNotPaused {}

    function claim(uint256 _stakeId) external nonReentrant whenNotPaused {}

    function setAPG(uint256 _APG, uint256 _eventId) external onlyOperator {
        require(_APG > 0, "APG must be greater than zero");
    }

    function setOperator(address operator, bool isOperator_) public onlyOwner {
        _operators[operator] = isOperator_;
        emit Operator(operator, isOperator_);
    }

    function setWhiteListCollection(address _collection) external {}

    function setWhiteListCurrency(address _currency) external {}

    function emergencyWithdraw() external onlyOwner {}

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    /*----------------------------- INTERNAL FUNCTION -----------------------------------*/

    function _computeClaimable(uint256 stakeId)
        internal
        returns (uint256 claimable)
    {}

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
