// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title WrappedNativeToken
 * @dev A wrapped version of the native token (cBTC) that implements ERC20
 * Allows users to deposit native tokens and receive wrapped tokens 1:1
 */
contract WrappedNativeToken is ERC20, ReentrancyGuard {
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);

    constructor() ERC20("Wrapped cBTC", "WcBTC") {}

    /**
     * @dev Deposit native tokens and receive wrapped tokens
     */
    function deposit() external payable nonReentrant {
        require(msg.value > 0, "Must deposit positive amount");
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev Withdraw wrapped tokens and receive native tokens
     * @param amount The amount of wrapped tokens to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "Must withdraw positive amount");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        _burn(msg.sender, amount);

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit Withdraw(msg.sender, amount);
    }

    /**
     * @dev Get the total supply of wrapped tokens
     */
    function totalNativeDeposited() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Allow contract to receive native tokens directly
     */
    receive() external payable {
        if (msg.value > 0) {
            _mint(msg.sender, msg.value);
            emit Deposit(msg.sender, msg.value);
        }
    }

    /**
     * @dev Fallback function to handle direct transfers
     */
    fallback() external payable {
        revert("Use deposit() or send directly to contract");
    }
}
