// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.7.6;

import './interfaces/IMauvePermissions.sol';

/// @title Mauve Permissioning contract
/// @notice Inherited by Factory to control permissions of callable functions across the Mauve stack
contract MauvePermissions is IMauvePermissions {
    /// @inheritdoc IMauvePermissions
    address public override swapRouter;
    /// @inheritdoc IMauvePermissions
    address public override positionManager;

    /// @inheritdoc IMauvePermissions
    function setSwapRouter(address _router) public virtual override {
        emit SwapRouterChanged(swapRouter, _router);
        swapRouter = _router;
    }

    /// @inheritdoc IMauvePermissions
    function setPositionManager(address _positionManager) public virtual override {
        emit PositionManagerChanged(positionManager, _positionManager);
        positionManager = _positionManager;
    }
}
