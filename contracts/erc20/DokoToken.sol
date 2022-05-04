/* SPDX-License-Identifier: MIT */
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "../utils/IBotProtection.sol";

contract DokoToken is Ownable, Pausable, ERC20Burnable, ERC20Capped {
    IBotProtection public botProtectionContract;
    bool public botProtectionEnabled;

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        address ownerAddress
    ) Ownable() Pausable() ERC20(name_, symbol_) ERC20Capped(maxSupply_) {
        Ownable.transferOwnership(ownerAddress);
    }

    event BotProtectionAdded(address indexed botProtectionContract);
    event BotProtectionEnabled(bool indexed enabled);
    event BotProtectionTransfer(
        address indexed from,
        address indexed to,
        uint256 indexed amount
    );

    modifier botProtectIfEnabled(
        address sender,
        address recipient,
        uint256 amount
    ) {
        _checkProtection(sender, recipient, amount);
        _;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setBotProtectionAddress(address botProtectAddress)
        external
        onlyOwner
    {
        require(
            address(botProtectionContract) == address(0),
            "Can only be initialized once"
        );
        botProtectionContract = IBotProtection(botProtectAddress);
        emit BotProtectionAdded(botProtectAddress);
    }

    function setBotProtectionEnabled(bool enabled) external onlyOwner {
        require(
            address(botProtectionContract) != address(0),
            "You have to set bot protection address first"
        );
        botProtectionEnabled = enabled;
        emit BotProtectionEnabled(enabled);
    }

    function mint(address account, uint256 amount) external onlyOwner {
        _mint(account, amount);
    }

    function transfer(address to, uint256 amount)
        public
        virtual
        override
        whenNotPaused
        botProtectIfEnabled(_msgSender(), to, amount)
        returns (bool)
    {
        return super.transfer(to, amount);
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    )
        public
        virtual
        override
        whenNotPaused
        botProtectIfEnabled(from, to, amount)
        returns (bool)
    {
        return super.transferFrom(from, to, amount);
    }

    function approve(address spender, uint256 amount)
        public
        virtual
        override
        whenNotPaused
        returns (bool)
    {
        return super.approve(spender, amount);
    }

    function increaseAllowance(address spender, uint256 addedValue)
        public
        virtual
        override
        whenNotPaused
        returns (bool)
    {
        return super.increaseAllowance(spender, addedValue);
    }

    function decreaseAllowance(address spender, uint256 subtractedValue)
        public
        virtual
        override
        whenNotPaused
        returns (bool)
    {
        return super.decreaseAllowance(spender, subtractedValue);
    }

    function burn(uint256 amount) public virtual override whenNotPaused {
        super.burn(amount);
    }

    function burnFrom(address account, uint256 amount)
        public
        virtual
        override
        whenNotPaused
    {
        super.burnFrom(account, amount);
    }

    function _mint(address account, uint256 amount)
        internal
        virtual
        override(ERC20, ERC20Capped)
    {
        ERC20Capped._mint(account, amount);
    }

    function _checkProtection(
        address sender,
        address recipient,
        uint256 amount
    ) internal {
        if (botProtectionEnabled) {
            botProtectionContract.protect(sender, recipient, amount);
            emit BotProtectionTransfer(sender, recipient, amount);
        }
    }
}
