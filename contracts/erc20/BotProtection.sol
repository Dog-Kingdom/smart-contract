// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../utils/IBotProtection.sol";

contract BotProtection is
    UUPSUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    IBotProtection
{
    struct ExchangeAmount {
        mapping(uint256 => uint256) buyingAmount;
        mapping(uint256 => uint256) sellingAmount;
    }

    uint256 public addressBuyLimit;
    uint256 public addressSellLimit;
    uint256 public dexBuyLimit;
    uint256 public dexSellLimit;
    uint256 public blockTransferLimit;
    mapping(address => bool) private _exchangeAddresses;

    mapping(address => ExchangeAmount) private _exchangeAmountOf;
    mapping(uint256 => uint256) private _blockTransferAmount;

    function initialize(
        uint256 addressBuyAmount_,
        uint256 addressSellAmount_,
        uint256 dexBuyLimit_,
        uint256 dexSellLimit_,
        uint256 blockTransferLimit_,
        address ownerAddress_
    ) external initializer {
        __UUPSUpgradeable_init();
        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        OwnableUpgradeable.transferOwnership(ownerAddress_);

        _setLimit(
            addressBuyAmount_,
            addressSellAmount_,
            dexBuyLimit_,
            dexSellLimit_,
            blockTransferLimit_
        );
    }

    event Limited(
        uint256 addressBuyLimit,
        uint256 addressSellLimit,
        uint256 dexBuyLimit,
        uint256 dexSellLimit,
        uint256 blockTransferLimit
    );
    event ExchangeAddress(address exchangeAddress, bool isExchangeAddress);

    function protect(
        address sender_,
        address recipient_,
        uint256 amount_
    ) external override nonReentrant {
        // this case is a normal transaction transfer
        if (!_exchangeAddresses[sender_] && !_exchangeAddresses[recipient_]) {
            return;
        }
        // this case is buying tokens from exchange
        if (_exchangeAddresses[sender_]) {
            //check bought amount of buyer
            ExchangeAmount storage amountOfBuyer = _exchangeAmountOf[
                recipient_
            ];
            uint256 addressBuyingAmount = amount_ +
                amountOfBuyer.buyingAmount[block.number];
            require(
                addressBuyingAmount <= addressBuyLimit,
                "Buyable amount of you exceeded"
            );
            amountOfBuyer.buyingAmount[block.number] = addressBuyingAmount;

            // check selling amount of DEX at current block
            ExchangeAmount storage amountOfDEX = _exchangeAmountOf[sender_];
            uint256 totalSellingAmountOfDEX = amount_ +
                amountOfDEX.sellingAmount[block.number];
            require(
                totalSellingAmountOfDEX <= dexSellLimit,
                "Buyable amount of this block exceeded"
            );
            amountOfDEX.sellingAmount[block.number] = totalSellingAmountOfDEX;
        }

        // this case is selling tokens to exchange
        if (_exchangeAddresses[recipient_]) {
            ////check sold amount of sender
            ExchangeAmount storage amountOfSeller = _exchangeAmountOf[sender_];
            uint256 addressSellingAmount = amount_ +
                amountOfSeller.sellingAmount[block.number];
            require(
                addressSellingAmount <= addressSellLimit,
                "Saleable amount of you exceeded"
            );
            amountOfSeller.sellingAmount[block.number] = addressSellingAmount;

            //check buying amount of DEX at current block
            ExchangeAmount storage amountOfDEX = _exchangeAmountOf[recipient_];
            uint256 totalBuyingAmountOfDEX = amount_ +
                amountOfDEX.buyingAmount[block.number];
            require(
                totalBuyingAmountOfDEX <= dexBuyLimit,
                "Saleable amount of this block exceeded"
            );
            amountOfDEX.buyingAmount[block.number] = totalBuyingAmountOfDEX;
        }

        // requiring total transfer amount in block must be not exceed limited amount
        uint256 totalTransferAmount = amount_ +
            _blockTransferAmount[block.number];

        require(
            totalTransferAmount <= blockTransferLimit,
            "Transferable amount exceeded"
        );

        _blockTransferAmount[block.number] = totalTransferAmount;
    }

    function setLimit(
        uint256 addressBuyAmount_,
        uint256 addressSellAmount_,
        uint256 dexBuyLimit_,
        uint256 dexSellLimit_,
        uint256 blockTransferLimit_
    ) external onlyOwner {
        require(
            addressBuyAmount_ > 0,
            "Address buy limit must be greater than zero"
        );
        require(
            addressSellAmount_ > 0,
            "Address sell limit must be greater than zero"
        );
        require(dexBuyLimit_ > 0, "DEX buy limit must be greater than zero");
        require(dexSellLimit_ > 0, "DEX sell limit must be greater than zero");
        require(
            blockTransferLimit_ >= (dexBuyLimit_ + dexSellLimit_),
            "Block transfer limit must be greater than total of dex buy limit and dex sell limit"
        );
        _setLimit(
            addressBuyAmount_,
            addressSellAmount_,
            dexBuyLimit_,
            dexSellLimit_,
            blockTransferLimit_
        );
    }

    function setExchangeAddress(
        address exchangeAddress_,
        bool isExchangeAddress_
    ) external onlyOwner {
        _exchangeAddresses[exchangeAddress_] = isExchangeAddress_;
        emit ExchangeAddress(exchangeAddress_, isExchangeAddress_);
    }

    function isExchangeAddress(address exchangeAddress_)
        external
        view
        returns (bool)
    {
        return _exchangeAddresses[exchangeAddress_];
    }

    function _setLimit(
        uint256 _addressBuyLimit,
        uint256 _addressSellLimit,
        uint256 _dexBuyLimit,
        uint256 _dexSellLimit,
        uint256 _blockTransferLimit
    ) internal {
        addressBuyLimit = _addressBuyLimit;
        addressSellLimit = _addressSellLimit;
        dexBuyLimit = _dexBuyLimit;
        dexSellLimit = _dexSellLimit;
        blockTransferLimit = _blockTransferLimit;
        emit Limited(
            addressBuyLimit,
            addressBuyLimit,
            dexBuyLimit,
            dexSellLimit,
            blockTransferLimit
        );
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
