// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../erc721/Box.sol";
import "../erc721/Dog.sol";
import "../erc721/Equipment.sol";
import "../erc20/DKToken.sol";

contract Deposit is
    UUPSUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using AddressUpgradeable for address;

    DogContract public dogContract;
    EquipmentContract public equipmentContract;
    DKToken public dkToken;

    address public vault;
    mapping(address => bool) private _operators;

    BoxContract public boxContract;

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

    struct EquipmentNft {
        uint256 speed;
        uint256 stamina;
        uint256 strength;
        string cid;
    }

    function initialize(
        address dkToken_,
        address dogContract_,
        address equipmentContract_,
        address vault_,
        address ownerAddress_
    ) public initializer {
        __UUPSUpgradeable_init();
        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        dkToken = DKToken(dkToken_);
        dogContract = DogContract(dogContract_);
        equipmentContract = EquipmentContract(equipmentContract_);
        vault = vault_;
        OwnableUpgradeable.transferOwnership(ownerAddress_);
    }

    // <=================================== EVENTS ===================================>

    event EDKToken(address dkToken);
    event EEquipmentContract(address equipmentContract);
    event EDogContract(address dogContract);
    event EBoxContract(address boxContract);
    event EVault(address vault);
    event Operator(address operator, bool isOperator);

    event DepositToken(
        string userId,
        address account,
        address tokenContract,
        uint256 amount
    );
    event DepositNFT(
        string userId,
        address account,
        address nftContract,
        uint256[] tokenIds
    );

    // <=================================== MODIFIERS ===================================>

    modifier onlyOperator() {
        _onlyOperator();
        _;
    }

    modifier isSetupTokenContact() {
        require(_isSetupTokenContact(), "Have not set token contract yet");
        _;
    }

    modifier isSetupNFTContact() {
        require(_isSetupNFTContact(), "Have not set NFT contract yet");
        _;
    }

    // <=================================== PUBLIC FUNCTION ===================================>

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setDKToken(address _DKToken) external {
        require(_DKToken.isContract(), "Dk token must be smart contract");
        dkToken = DKToken(_DKToken);
        emit EDKToken(_DKToken);
    }

    function setBoxContract(address _boxContract) external {
        require(
            _boxContract.isContract(),
            "Box contract must be smart contract"
        );
        boxContract = BoxContract(_boxContract);
        emit EBoxContract(_boxContract);
    }

    function setDogContract(address _dogContract) external {
        require(
            _dogContract.isContract(),
            "Dog contract must be smart contract"
        );
        dogContract = DogContract(_dogContract);
        emit EDogContract(_dogContract);
    }

    function setEquipmentContract(address _equipmentContract) external {
        require(
            _equipmentContract.isContract(),
            "Equipment contract must be smart contract"
        );
        equipmentContract = EquipmentContract(_equipmentContract);
        emit EEquipmentContract(_equipmentContract);
    }

    function setVault(address newVault) external onlyOwner {
        require(newVault.isContract(), "Vault must be smart contract");
        vault = newVault;
        emit EVault(vault);
    }

    function setOperator(address operator, bool isOperator_) public onlyOwner {
        _operators[operator] = isOperator_;
        emit Operator(operator, isOperator_);
    }

    function depositToken(
        string memory userId,
        address tokenContract,
        uint256 amount
    ) public whenNotPaused nonReentrant isSetupTokenContact {
        _checkDepositData(userId);
        require(DKToken(tokenContract) == dkToken, "Token contract is invalid");
        IERC20Upgradeable(tokenContract).safeTransferFrom(
            _msgSender(),
            vault,
            amount
        );

        emit DepositToken(userId, _msgSender(), tokenContract, amount);
    }

    function depositNFT(
        string memory userId,
        address nftContract,
        uint256[] memory tokenIds
    ) public whenNotPaused nonReentrant isSetupNFTContact {
        _checkDepositData(userId);
        require(
            DogContract(nftContract) == dogContract ||
                EquipmentContract(nftContract) == equipmentContract,
            "NFT contract is invalid"
        );

        if (DogContract(nftContract) == dogContract) {
            dogContract.safeBatchTransferFrom(_msgSender(), vault, tokenIds);
        } else if (EquipmentContract(nftContract) == equipmentContract) {
            equipmentContract.safeBatchTransferFrom(
                _msgSender(),
                vault,
                tokenIds
            );
        } else {
            boxContract.safeBatchTransferFrom(_msgSender(), vault, tokenIds);
        }

        emit DepositNFT(userId, _msgSender(), nftContract, tokenIds);
    }

    function isOperator(address operator) public view returns (bool) {
        return _operators[operator];
    }

    function _onlyOperator() private view {
        require(_operators[_msgSender()], "Deposit: Sender is not operator");
    }

    function _isSetupTokenContact() private view returns (bool) {
        if ((address(dkToken) != address(0) && address(dkToken).isContract())) {
            return true;
        }
        return false;
    }

    function _isSetupNFTContact() private view returns (bool) {
        if (
            (address(dogContract) != address(0) &&
                address(dogContract).isContract()) ||
            (address(equipmentContract) != address(0) &&
                address(equipmentContract).isContract())
        ) {
            return true;
        }
        return false;
    }

    function _checkDepositData(string memory userId)
        private
        view
        returns (bool)
    {
        require(
            vault != address(0) && vault.isContract(),
            "Vault has not set yet"
        );
        require(bytes(userId).length > 0, "User ID must not be empty");
        return true;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
