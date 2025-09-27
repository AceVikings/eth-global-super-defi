// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./CitreaOptionsTrading.sol";

/**
 * @title CitreaLayeredOptionsManager
 * @dev Minimal working layered options system using ERC1155 tokens
 * Extends the existing CitreaOptionsTrading with layered functionality
 */
contract CitreaLayeredOptionsManager is ERC1155, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct LayeredOption {
        uint256 tokenId;
        uint256 parentTokenId;        // 0 for root
        uint256 baseOptionId;         // ID in base CitreaOptionsTrading contract
        address holder;
        bool isUsedAsCollateral;
        uint256 childTokenId;
        uint256 createdAt;
    }

    CitreaOptionsTrading public baseContract;
    mapping(uint256 => LayeredOption) public layeredOptions;
    mapping(address => uint256[]) public userTokens;
    uint256 public nextTokenId = 1;

    event LayeredOptionCreated(
        uint256 indexed tokenId,
        uint256 indexed parentTokenId,
        uint256 indexed baseOptionId,
        address holder
    );

    constructor(
        address _owner,
        address _baseContract,
        string memory _uri
    ) ERC1155(_uri) Ownable(_owner) {
        baseContract = CitreaOptionsTrading(_baseContract);
    }

    function createLayeredOption(
        uint256 baseOptionId
    ) external returns (uint256) {
        // Basic validation that option exists (simplified)
        require(baseOptionId > 0, "Invalid option ID");
        // In production, you'd add proper ownership checks

        uint256 tokenId = nextTokenId++;
        layeredOptions[tokenId] = LayeredOption({
            tokenId: tokenId,
            parentTokenId: 0,
            baseOptionId: baseOptionId,
            holder: msg.sender,
            isUsedAsCollateral: false,
            childTokenId: 0,
            createdAt: block.timestamp
        });

        _mint(msg.sender, tokenId, 1, "");
        userTokens[msg.sender].push(tokenId);

        emit LayeredOptionCreated(tokenId, 0, baseOptionId, msg.sender);
        return tokenId;
    }

    function createChildOption(
        uint256 parentTokenId
    ) external returns (uint256) {
        require(balanceOf(msg.sender, parentTokenId) > 0, "Not parent token holder");
        
        LayeredOption storage parent = layeredOptions[parentTokenId];
        require(!parent.isUsedAsCollateral, "Already used as collateral");

        uint256 childTokenId = nextTokenId++;
        layeredOptions[childTokenId] = LayeredOption({
            tokenId: childTokenId,
            parentTokenId: parentTokenId,
            baseOptionId: parent.baseOptionId,
            holder: msg.sender,
            isUsedAsCollateral: false,
            childTokenId: 0,
            createdAt: block.timestamp
        });

        parent.isUsedAsCollateral = true;
        parent.childTokenId = childTokenId;

        _mint(msg.sender, childTokenId, 1, "");
        userTokens[msg.sender].push(childTokenId);

        emit LayeredOptionCreated(childTokenId, parentTokenId, parent.baseOptionId, msg.sender);
        return childTokenId;
    }

    function getLayeredOption(uint256 tokenId) external view returns (LayeredOption memory) {
        return layeredOptions[tokenId];
    }

    function getUserTokens(address user) external view returns (uint256[] memory) {
        return userTokens[user];
    }

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts
    ) internal virtual override {
        super._update(from, to, ids, amounts);
        
        for (uint256 i = 0; i < ids.length; i++) {
            if (amounts[i] > 0 && to != address(0)) {
                layeredOptions[ids[i]].holder = to;
            }
        }
    }
}