// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TimeOracle
 * @dev A time oracle contract that can be controlled for demo purposes
 * Allows manipulation of time for testing option expiry scenarios
 */
contract TimeOracle is Ownable {
    uint256 private timeOffset;
    bool private useRealTime;
    
    event TimeOffsetUpdated(uint256 newOffset);
    event TimeSourceChanged(bool useRealTime);

    constructor(address _owner) Ownable(_owner) {
        useRealTime = true;
        timeOffset = 0;
    }

    /**
     * @dev Get the current time according to the oracle
     */
    function getCurrentTime() external view returns (uint256) {
        if (useRealTime) {
            return block.timestamp;
        }
        return block.timestamp + timeOffset;
    }

    /**
     * @dev Set a time offset (only owner)
     * @param _offset Time offset in seconds (can be positive or negative)
     */
    function setTimeOffset(int256 _offset) external onlyOwner {
        if (_offset >= 0) {
            timeOffset = uint256(_offset);
        } else {
            // Handle negative offset by ensuring we don't underflow
            uint256 absOffset = uint256(-_offset);
            if (absOffset <= block.timestamp) {
                timeOffset = block.timestamp - absOffset - block.timestamp; // This creates the negative effect
            } else {
                timeOffset = 0; // Clamp to current time if offset is too negative
            }
        }
        useRealTime = false;
        emit TimeOffsetUpdated(timeOffset);
    }

    /**
     * @dev Reset to use real blockchain time
     */
    function useBlockTime() external onlyOwner {
        useRealTime = true;
        timeOffset = 0;
        emit TimeSourceChanged(true);
    }

    /**
     * @dev Set absolute time (only owner)
     * @param _timestamp Absolute timestamp to set
     */
    function setAbsoluteTime(uint256 _timestamp) external onlyOwner {
        require(_timestamp > 0, "Invalid timestamp");
        if (_timestamp >= block.timestamp) {
            timeOffset = _timestamp - block.timestamp;
        } else {
            timeOffset = 0; // Cannot go back in time beyond current block
        }
        useRealTime = false;
        emit TimeOffsetUpdated(timeOffset);
    }

    /**
     * @dev Fast forward time by specific duration
     * @param _duration Duration to fast forward in seconds
     */
    function fastForward(uint256 _duration) external onlyOwner {
        timeOffset += _duration;
        useRealTime = false;
        emit TimeOffsetUpdated(timeOffset);
    }

    /**
     * @dev Get the next 15th of the month from current time
     */
    function getNext15th() external view returns (uint256) {
        uint256 currentTime = useRealTime ? block.timestamp : block.timestamp + timeOffset;
        
        // Calculate timestamp for 15th of current month (simplified - using 30-day months)
        uint256 fifteenth = currentTime - (currentTime % 30 days) + (15 * 1 days);
        
        // If we've passed the 15th, move to next month
        if (currentTime > fifteenth) {
            fifteenth += 30 days;
        }
        
        return fifteenth;
    }

    /**
     * @dev Get the next 30th of the month from current time
     */
    function getNext30th() external view returns (uint256) {
        uint256 currentTime = useRealTime ? block.timestamp : block.timestamp + timeOffset;
        
        // Calculate timestamp for 30th of current month (simplified)
        uint256 thirtieth = currentTime - (currentTime % 30 days) + (30 * 1 days);
        
        // If we've passed the 30th, move to next month
        if (currentTime > thirtieth) {
            thirtieth += 30 days;
        }
        
        return thirtieth;
    }

    /**
     * @dev Check if current time is past a specific timestamp
     */
    function isExpired(uint256 _expiryTime) external view returns (bool) {
        uint256 currentTime = useRealTime ? block.timestamp : block.timestamp + timeOffset;
        return currentTime >= _expiryTime;
    }

    /**
     * @dev Get time until expiry
     */
    function getTimeToExpiry(uint256 _expiryTime) external view returns (uint256) {
        uint256 currentTime = useRealTime ? block.timestamp : block.timestamp + timeOffset;
        if (currentTime >= _expiryTime) {
            return 0;
        }
        return _expiryTime - currentTime;
    }

    /**
     * @dev Get current time configuration
     */
    function getTimeConfig() external view returns (bool usingRealTime, uint256 offset, uint256 currentTime) {
        return (useRealTime, timeOffset, useRealTime ? block.timestamp : block.timestamp + timeOffset);
    }
}