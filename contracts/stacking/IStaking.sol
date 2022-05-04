// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

interface IStaking {
    /*----------------------------- ENUM -----------------------------------*/

    enum ItemType {
        ERC20,
        ERC721
    }

    enum StakingEventStatus {
        INACTIVE,
        ACTIVE,
        COMPLETED
    }

    enum StakingType {
        FIXED,
        FLEXIBLE
    }

    /*----------------------------- STRUCT -----------------------------------*/

    struct Event {
        uint256 restakeDelay;
        uint256 claimeDelay;
        uint256 stakingDelay;
        uint256 APG;
        uint256[] rewardsId;
        StakingType stakingType;
        StakingEventStatus status;
    }

    struct Reward {
        uint256 duration;
        uint256 withdrawalTime;
        uint256 maximumStake;
        uint256 minimumStake;
        bool isEternal;
        bool isDelete;
        ItemType itemType;
    }

    // struct RewardNFT{
    //   uint256 duration
    // }

    struct Stake {
        address wallet;
        uint256 totalAmount;
        uint256 claimedAmount;
        uint256 startTime;
        uint256 eventId;
        uint256 rewardId;
    }

    /*----------------------------- EVENT -----------------------------------*/

    event NewStakingEvent(
        uint256 eventId,
        uint256 restakeDelay,
        uint256 claimeDelay,
        uint256 stakingDelay,
        uint256 APG,
        uint256[] rewardsId,
        StakingType stakingType,
        StakingEventStatus status
    );

    event NewStakingReward(
        uint256 rewardId,
        uint256 duration,
        uint256 withdrawalTime,
        uint256 maximumStake,
        uint256 minimumStake,
        bool isEternal,
        bool isDelete,
        ItemType itemType
    );

    event NewStake(
        uint256 stakeId,
        address wallet,
        uint256 startTime,
        uint256 totalAmount,
        uint256 claimedAmount,
        uint256 eventId,
        uint256 rewardId
    );

    event UpdateStakingEvent(
        uint256 restakeDelay,
        uint256 claimeDelay,
        uint256 stakingDelay,
        uint256[] rewardsId,
        uint256 APG,
        StakingType stakingType,
        StakingEventStatus status
    );

    event ChangeStatusEvent(uint256[] eventsId);

    /*----------------------------- FUNCTION -----------------------------------*/

    function newEvent(Event memory _stakeEvent) external;

    function newReward(Reward memory _reward) external;

    function newStake(Stake memory _stake) external;

    function updateEvent(uint256 _eventId, Event memory _stakeEvent) external;

    function changeStatusEvent(uint256[] memory _eventsId) external;

    function deleteReward(uint256 _rewardId) external;

    function withdraw(uint256 _stakeId) external;

    function claim(uint256 _stakeId) external;

    function setAPG(uint256 _APG, uint256 _eventId) external;
}
