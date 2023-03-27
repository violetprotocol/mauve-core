// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.7.6;

import '../MauvePool.sol';

// used for testing time dependent behavior
contract MockTimeMauvePool is MauvePool {
    // Monday, October 5, 2020 9:00:00 AM GMT-05:00
    uint256 public time = 1601906400;

    function setFeeGrowthGlobal0X128(uint256 _feeGrowthGlobal0X128) external {
        feeGrowthGlobal0X128 = _feeGrowthGlobal0X128;
    }

    function setFeeGrowthGlobal1X128(uint256 _feeGrowthGlobal1X128) external {
        feeGrowthGlobal1X128 = _feeGrowthGlobal1X128;
    }

    function increaseFeeGrowthGlobal0X128(uint256 paid0) external {
        feeGrowthGlobal0X128 += FullMath.mulDiv(paid0, FixedPoint128.Q128, liquidity);
    }

    function increaseFeeGrowthGlobal1X128(uint256 paid1) external {
        feeGrowthGlobal1X128 += FullMath.mulDiv(paid1, FixedPoint128.Q128, liquidity);
    }

    function advanceTime(uint256 by) external {
        time += by;
    }

    function _blockTimestamp() internal view override returns (uint32) {
        return uint32(time);
    }
}
