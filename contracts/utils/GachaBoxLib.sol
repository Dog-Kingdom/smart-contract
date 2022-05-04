// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev Collection of functions related to the array type
 */
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "../gacha/IGacha.sol";

interface VerichainsNetRegistry {
    function randomService(uint256 key)
        external
        returns (VerichainsNetRandomService);
}

interface VerichainsNetRandomService {
    function random() external returns (uint256);
}

library GachaBoxLib {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    enum Type {
        EPIC_DOG_BOX,
        PREMIUM_DOG_BOX,
        EPIC_EQUIPMENT_BOX,
        PREMIUM_EQUIPMENT_BOX,
        GRAND_BOX,
        META_BOX,
        LUCKY_BOX
    }

    function _random(
        uint256 _boundary,
        uint256 VERICHAINS_RANDOM_KEY,
        address verichainVRFAddress
    ) internal returns (uint256) {
        uint256 randomNumber = VerichainsNetRegistry(verichainVRFAddress)
            .randomService(VERICHAINS_RANDOM_KEY)
            .random();
        return randomNumber % _boundary;
    }

    function _recoverSigner(
        bytes32 _ethSignedMessageHash,
        bytes memory _signature
    ) internal pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = _splitSignature(_signature);
        bytes32 hashMsg = _getEthSignedMessageHash(_ethSignedMessageHash);
        return ecrecover(hashMsg, v, r, s);
    }

    function _getEthSignedMessageHash(bytes32 _messageHash)
        internal
        pure
        returns (bytes32)
    {
        /*
        Signature is produced by signing a keccak256 hash with the following format:
        "\x19Ethereum Signed Message\n" + len(msg) + msg
        */
        return
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n32",
                    _messageHash
                )
            );
    }

    function _splitSignature(bytes memory _sig)
        internal
        pure
        returns (
            bytes32 r,
            bytes32 s,
            uint8 v
        )
    {
        require(_sig.length == 65, "Invalid signature length");

        assembly {
            /*
            First 32 bytes stores the length of the signature

            add(sig, 32) = pointer of sig + 32
            effectively, skips first 32 bytes of signature

            mload(p) loads next 32 bytes starting at the memory address p into memory
            */

            // first 32 bytes, after the length prefix
            r := mload(add(_sig, 32))
            // second 32 bytes
            s := mload(add(_sig, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(_sig, 96)))
        }

        // implicitly return (r, s, v)
    }

    function _remove(IGacha.DetailChildBox[] storage list, uint256 index)
        internal
        returns (IGacha.DetailChildBox[] storage)
    {
        list[index] = list[list.length - 1];
        list.pop();
        return list;
    }

    function _validateGachaEvent(
        string memory name,
        uint256 startTime,
        uint256 endTime,
        uint256 totalTypeBox,
        uint256 totalBoxes,
        IGacha.BoxData[] memory boxData
    ) internal pure {
        require(bytes(name).length > 0, "Name must not be empty"); //Name must not be empty
        require(startTime < endTime, "Start time >= end time"); //Start time must be less then end time
        require(totalBoxes > 0, "Total boxes == 0"); //Total boxes must be than greater than zero
        require(totalTypeBox > 0, "Total type box == 0"); //Total type box must be than greater than zero
        require(
            boxData.length == totalTypeBox,
            "Box data lists != total type box"
        ); //Box data lists must be equal total type box
    }

    function _payment(
        address _tokenCurrency,
        uint256 _boxPrice,
        address _msgSender,
        address feeReceiver
    ) internal {
        if (_tokenCurrency == address(0)) {
            // Handle BNB
            require(msg.value == _boxPrice, "Payment amount is invalid");
            // payable(feeReceiver).transfer(boxPrice);
            (bool success, ) = feeReceiver.call{value: _boxPrice}("");
            require(success, "Failed transfer");
        } else {
            //Handle ERC20
            IERC20Upgradeable(_tokenCurrency).safeTransferFrom(
                _msgSender,
                feeReceiver,
                _boxPrice
            );
        }
    }
}
