// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.5.0;

/// @title The interface for the Mauve Permissions contract
/// @notice The Mauve Permissions contract restricts the factory and pool from being called by unexpected external sources
interface IMauvePermissions {
    /// @notice Emitted when the SwapRouter address known by the factory is changed
    /// @param oldRouter The owner before the owner was changed
    /// @param newRouter The owner after the owner was changed
    event SwapRouterChanged(address indexed oldRouter, address indexed newRouter);

    /// @notice Emitted when the NonfungiblePositionManager address known by the factory is changed
    /// @param oldPositionManager The owner before the owner was changed
    /// @param newPositionManager The owner after the owner was changed
    event PositionManagerChanged(address indexed oldPositionManager, address indexed newPositionManager);

    /// @notice Emitted when the poolDeployer is changed
    /// @param oldPoolDeployer The poolDeployer before the poolDeployer was changed
    /// @param newPoolDeployer The poolDeployer after the poolDeployer was changed
    event PoolDeployerChanged(address indexed oldPoolDeployer, address indexed newPoolDeployer);

    /// @notice Returns the current SwapRouter used for swaps
    /// @dev Can be changed by the current owner via setSwapRouter
    /// @return The address of the SwapRouter
    function swapRouter() external view returns (address);

    /// @notice Returns the current NonfungiblePositionManager used for positions
    /// @dev Can be changed by the current owner via setPositionManager
    /// @return The address of the NonfungiblePositionManager
    function positionManager() external view returns (address);

    /// @notice Returns the current poolDeployer of the factory
    /// @dev Can be changed by the current owner via setPoolDeployer
    /// @return The address of the factory poolDeployer
    function poolDeployer() external view returns(address);

    /// @notice Updates the SwapRouter of the Pools
    /// @dev Must be called by the current owner
    /// @param _swapRouter The SwapRouter of the Pools
    function setSwapRouter(address _swapRouter) external;

    /// @notice Updates the NonfungiblePositionManager of the factory
    /// @dev Must be called by the current owner
    /// @param _positionManager The new NonfungiblePositionManager of the factory
    function setPositionManager(address _positionManager) external;

    /// @notice Updates the poolDeployer of the factory
    /// @dev Must be called by the current owner
    /// @param _poolDeployer The new poolDeployer of the factory
    function setPoolDeployer(address _poolDeployer) external;
}
