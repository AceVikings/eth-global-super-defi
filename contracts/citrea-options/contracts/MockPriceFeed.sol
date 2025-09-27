// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockPriceFeed
 * @dev A mock price feed contract that can be controlled for demo purposes
 * Simulates Chainlink-style price feeds with configurable prices
 */
contract MockPriceFeed is Ownable {
    struct RoundData {
        uint80 roundId;
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
    }

    string public description;
    uint8 public decimals;
    uint256 public version = 1;

    uint80 private currentRoundId;
    mapping(uint80 => RoundData) private rounds;
    
    int256 private _latestAnswer;
    uint256 private _latestTimestamp;

    event AnswerUpdated(int256 indexed current, uint256 indexed roundId, uint256 updatedAt);
    event NewRound(uint256 indexed roundId, address indexed startedBy, uint256 startedAt);

    constructor(
        string memory _description,
        uint8 _decimals,
        int256 _initialAnswer,
        address _owner
    ) Ownable(_owner) {
        description = _description;
        decimals = _decimals;
        currentRoundId = 1;
        _latestAnswer = _initialAnswer;
        _latestTimestamp = block.timestamp;
        
        // Initialize the first round
        rounds[currentRoundId] = RoundData({
            roundId: currentRoundId,
            answer: _initialAnswer,
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: currentRoundId
        });
    }

    /**
     * @dev Update the price (only owner)
     * @param _price The new price to set
     */
    function updateAnswer(int256 _price) external onlyOwner {
        currentRoundId++;
        _latestAnswer = _price;
        _latestTimestamp = block.timestamp;
        
        rounds[currentRoundId] = RoundData({
            roundId: currentRoundId,
            answer: _price,
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: currentRoundId
        });
        
        emit NewRound(currentRoundId, msg.sender, block.timestamp);
        emit AnswerUpdated(_price, currentRoundId, block.timestamp);
    }

    /**
     * @dev Get the latest price data
     */
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        RoundData memory round = rounds[currentRoundId];
        return (
            round.roundId,
            round.answer,
            round.startedAt,
            round.updatedAt,
            round.answeredInRound
        );
    }

    /**
     * @dev Get historical price data for a specific round
     */
    function getRoundData(uint80 _roundId)
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        require(_roundId <= currentRoundId && _roundId > 0, "Round not available");
        RoundData memory round = rounds[_roundId];
        return (
            round.roundId,
            round.answer,
            round.startedAt,
            round.updatedAt,
            round.answeredInRound
        );
    }

    /**
     * @dev Get the latest answer (simplified interface)
     */
    function latestAnswer() external view returns (int256) {
        return _latestAnswer;
    }

    /**
     * @dev Get the latest timestamp
     */
    function latestTimestamp() external view returns (uint256) {
        return _latestTimestamp;
    }

    /**
     * @dev Get the latest round ID
     */
    function latestRound() external view returns (uint256) {
        return currentRoundId;
    }

    /**
     * @dev Get answer for a specific round (simplified)
     */
    function getAnswer(uint256 _roundId) external view returns (int256) {
        require(_roundId <= currentRoundId && _roundId > 0, "Round not available");
        return rounds[uint80(_roundId)].answer;
    }

    /**
     * @dev Get timestamp for a specific round
     */
    function getTimestamp(uint256 _roundId) external view returns (uint256) {
        require(_roundId <= currentRoundId && _roundId > 0, "Round not available");
        return rounds[uint80(_roundId)].updatedAt;
    }

    /**
     * @dev Set multiple price updates at once for testing
     */
    function updateAnswerBatch(int256[] calldata _prices) external onlyOwner {
        for (uint i = 0; i < _prices.length; i++) {
            currentRoundId++;
            _latestAnswer = _prices[i];
            _latestTimestamp = block.timestamp;
            
            rounds[currentRoundId] = RoundData({
                roundId: currentRoundId,
                answer: _prices[i],
                startedAt: block.timestamp,
                updatedAt: block.timestamp,
                answeredInRound: currentRoundId
            });
            
            emit NewRound(currentRoundId, msg.sender, block.timestamp);
            emit AnswerUpdated(_prices[i], currentRoundId, block.timestamp);
        }
    }
}