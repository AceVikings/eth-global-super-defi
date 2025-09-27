// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockERC20
 * @dev A mock ERC20 token contract for testing and demo purposes
 * Allows minting tokens to any address for testing collateral scenarios
 */
contract MockERC20 is ERC20, Ownable {
    uint8 private _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_,
        uint256 initialSupply,
        address owner
    ) ERC20(name, symbol) Ownable(owner) {
        _decimals = decimals_;
        if (initialSupply > 0) {
            _mint(owner, initialSupply * 10 ** decimals_);
        }
    }

    /**
     * @dev Returns the number of decimals used to get its user representation
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint tokens to a specific address (only owner)
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint (in token units, not wei)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount * 10 ** _decimals);
    }

    /**
     * @dev Mint tokens in raw units (including decimals)
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint in raw units
     */
    function mintRaw(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Burn tokens from a specific address (only owner)
     * @param from The address to burn tokens from
     * @param amount The amount of tokens to burn (in token units, not wei)
     */
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount * 10 ** _decimals);
    }

    /**
     * @dev Burn tokens in raw units (including decimals)
     * @param from The address to burn tokens from
     * @param amount The amount of tokens to burn in raw units
     */
    function burnRaw(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }

    /**
     * @dev Allow anyone to mint tokens for testing purposes
     * @param amount The amount of tokens to mint to the caller
     */
    function faucet(uint256 amount) external {
        _mint(msg.sender, amount * 10 ** _decimals);
    }
}
