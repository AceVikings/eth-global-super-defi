// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CitreaLayeredOptionsMinimal is ERC1155, Ownable {
    constructor(address initialOwner) 
        ERC1155("https://metadata.citreaoptions.com/{id}")
        Ownable(initialOwner)
    {}
    
    function createOption() external pure returns (uint256) {
        return 1;
    }
}