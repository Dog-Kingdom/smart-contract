// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract Vault is
    UUPSUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ERC721HolderUpgradeable
{
    using AddressUpgradeable for address;

    address public controllerContract;

    mapping(address => bool) private _whitelistTokenContract;
    mapping(address => bool) private _whitelistNFTContract;

    function initialize(address ownerAddress_) public initializer {
        __UUPSUpgradeable_init();
        __Ownable_init();
        __Pausable_init();
        __ERC721Holder_init();

        OwnableUpgradeable.transferOwnership(ownerAddress_);
    }

    event NewControllerContract(address controllerContract);
    event WhitelistTokenContract(address tokenContract, bool isWhitelist);
    event WhitelistNFTContract(address nftContract, bool isWhitelist);

    modifier checkSmartContract(address smartContract) {
        _checkSmartContract(smartContract);
        _;
    }

    function setControllerContract(address newControllerContract)
        external
        onlyOwner
        checkSmartContract(newControllerContract)
    {
        controllerContract = newControllerContract;
        emit NewControllerContract(controllerContract);
    }

    function setWhitelistTokenContract(address tokenContract, bool isWhitelist)
        external
        onlyOwner
        checkSmartContract(tokenContract)
    {
        _checkControllerContract();
        _whitelistTokenContract[tokenContract] = isWhitelist;
        if (isWhitelist) {
            IERC20Upgradeable(tokenContract).approve(
                controllerContract,
                2**256 - 1
            );
        }

        emit WhitelistTokenContract(tokenContract, isWhitelist);
    }

    function setWhitelistNFTContract(address nftContract, bool isWhitelist)
        external
        onlyOwner
        checkSmartContract(nftContract)
    {
        _checkControllerContract();
        _whitelistNFTContract[nftContract] = isWhitelist;
        if (isWhitelist) {
            IERC721Upgradeable(nftContract).setApprovalForAll(
                controllerContract,
                true
            );
        }

        emit WhitelistNFTContract(nftContract, isWhitelist);
    }

    function isWhitelistTokenContract(address tokenContract)
        public
        view
        returns (bool)
    {
        return _whitelistTokenContract[tokenContract];
    }

    function isWhitelistNFTContract(address nftContract)
        public
        view
        returns (bool)
    {
        return _whitelistNFTContract[nftContract];
    }

    function _checkSmartContract(address smartContract)
        private
        view
        returns (bool)
    {
        require(
            smartContract != address(0) && smartContract.isContract(),
            "Must be smart contract"
        );
        return true;
    }

    function _checkControllerContract() private view returns (bool) {
        require(
            controllerContract != address(0) && controllerContract.isContract(),
            "Have not set controller contract"
        );
        return true;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
