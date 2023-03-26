import bn from 'bignumber.js'
import { BigNumber, BigNumberish, constants, Contract, ContractTransaction, utils, Wallet } from 'ethers'
import { TestMauveCallee } from '../../typechain/TestMauveCallee'
import { TestMauveRouter } from '../../typechain/TestMauveRouter'
import { MockTimeMauvePool } from '../../typechain/MockTimeMauvePool'
import { TestERC20 } from '../../typechain/TestERC20'

export const MaxUint128 = BigNumber.from(2).pow(128).sub(1)

export const getMinTick = (tickSpacing: number) => Math.ceil(-887272 / tickSpacing) * tickSpacing
export const getMaxTick = (tickSpacing: number) => Math.floor(887272 / tickSpacing) * tickSpacing
export const getMaxLiquidityPerTick = (tickSpacing: number) =>
  BigNumber.from(2)
    .pow(128)
    .sub(1)
    .div((getMaxTick(tickSpacing) - getMinTick(tickSpacing)) / tickSpacing + 1)

export const MIN_SQRT_RATIO = BigNumber.from('4295128739')
export const MAX_SQRT_RATIO = BigNumber.from('1461446703485210103287273052203988822378723970342')

export enum FeeAmount {
  LOW = 500,
  MEDIUM = 3000,
  HIGH = 10000,
}

export const TICK_SPACINGS: { [amount in FeeAmount]: number } = {
  [FeeAmount.LOW]: 10,
  [FeeAmount.MEDIUM]: 60,
  [FeeAmount.HIGH]: 200,
}

export function expandTo18Decimals(n: number): BigNumber {
  return BigNumber.from(n).mul(BigNumber.from(10).pow(18))
}

export function getCreate2Address(
  factoryAddress: string,
  [tokenA, tokenB]: [string, string],
  fee: number,
  bytecode: string
): string {
  const [token0, token1] = tokenA.toLowerCase() < tokenB.toLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA]
  const constructorArgumentsEncoded = utils.defaultAbiCoder.encode(
    ['address', 'address', 'uint24'],
    [token0, token1, fee]
  )
  const create2Inputs = [
    '0xff',
    factoryAddress,
    // salt
    utils.keccak256(constructorArgumentsEncoded),
    // init code. bytecode + constructor arguments
    utils.keccak256(bytecode),
  ]
  const sanitizedInputs = `0x${create2Inputs.map((i) => i.slice(2)).join('')}`
  return utils.getAddress(`0x${utils.keccak256(sanitizedInputs).slice(-40)}`)
}

bn.config({ EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 })

// returns the sqrt price as a 64x96
export function encodePriceSqrt(reserve1: BigNumberish, reserve0: BigNumberish): BigNumber {
  return BigNumber.from(
    new bn(reserve1.toString())
      .div(reserve0.toString())
      .sqrt()
      .multipliedBy(new bn(2).pow(96))
      .integerValue(3)
      .toString()
  )
}

export function getPositionKey(address: string, lowerTick: number, upperTick: number): string {
  return utils.keccak256(utils.solidityPack(['address', 'int24', 'int24'], [address, lowerTick, upperTick]))
}

export type SwapFunction = (
  amount: BigNumberish,
  to: Wallet | string,
  sqrtPriceLimitX96?: BigNumberish,
  swapTarget?: TestMauveCallee
) => Promise<ContractTransaction>
export type SwapToPriceFunction = (sqrtPriceX96: BigNumberish, to: Wallet | string) => Promise<ContractTransaction>
export type MintFunction = (
  tickLower: BigNumberish,
  tickUpper: BigNumberish,
  liquidity: BigNumberish,
  targetContract?: TestMauveCallee
) => Promise<ContractTransaction>
export type BurnFunction = (
  tickLower: BigNumberish,
  tickUpper: BigNumberish,
  liquidity: BigNumberish,
  targetContract?: TestMauveCallee
) => Promise<ContractTransaction>

export type CollectFunction = (
  recipient: string,
  tickLower: BigNumberish,
  tickUpper: BigNumberish,
  amount0Requested: BigNumberish,
  amount1Requested: BigNumberish,
  targetContract?: TestMauveCallee
) => Promise<ContractTransaction>

export interface PoolFunctions {
  swapToLowerPrice: SwapToPriceFunction
  swapToHigherPrice: SwapToPriceFunction
  swapExact0For1: SwapFunction
  swap0ForExact1: SwapFunction
  swapExact1For0: SwapFunction
  swap1ForExact0: SwapFunction
  mint: MintFunction
  burn: BurnFunction
  collect: CollectFunction
}
export function createPoolFunctions({
  swapTarget,
  token0,
  token1,
  pool,
}: {
  swapTarget: TestMauveCallee
  token0: TestERC20
  token1: TestERC20
  pool: MockTimeMauvePool
}): PoolFunctions {
  async function swapToSqrtPrice(
    inputToken: Contract,
    targetPrice: BigNumberish,
    to: Wallet | string
  ): Promise<ContractTransaction> {
    const method = inputToken === token0 ? swapTarget.swapToLowerSqrtPrice : swapTarget.swapToHigherSqrtPrice

    await inputToken.approve(swapTarget.address, constants.MaxUint256)

    const toAddress = typeof to === 'string' ? to : to.address

    return method(pool.address, targetPrice, toAddress)
  }

  async function swap(
    inputToken: Contract,
    [amountIn, amountOut]: [BigNumberish, BigNumberish],
    to: Wallet | string,
    sqrtPriceLimitX96?: BigNumberish,
    swapTargetOverride?: TestMauveCallee
  ): Promise<ContractTransaction> {
    const target = swapTargetOverride ? swapTargetOverride : swapTarget
    const exactInput = amountOut === 0

    const method =
      inputToken === token0
        ? exactInput
          ? target.swapExact0For1
          : target.swap0ForExact1
        : exactInput
        ? target.swapExact1For0
        : target.swap1ForExact0

    if (typeof sqrtPriceLimitX96 === 'undefined') {
      if (inputToken === token0) {
        sqrtPriceLimitX96 = MIN_SQRT_RATIO.add(1)
      } else {
        sqrtPriceLimitX96 = MAX_SQRT_RATIO.sub(1)
      }
    }
    await inputToken.approve(target.address, constants.MaxUint256)

    const toAddress = typeof to === 'string' ? to : to.address

    return method(pool.address, exactInput ? amountIn : amountOut, toAddress, sqrtPriceLimitX96)
  }

  const swapToLowerPrice: SwapToPriceFunction = (sqrtPriceX96, to) => {
    return swapToSqrtPrice(token0, sqrtPriceX96, to)
  }

  const swapToHigherPrice: SwapToPriceFunction = (sqrtPriceX96, to) => {
    return swapToSqrtPrice(token1, sqrtPriceX96, to)
  }

  const swapExact0For1: SwapFunction = (amount, to, sqrtPriceLimitX96, targetOverride) => {
    return swap(token0, [amount, 0], to, sqrtPriceLimitX96, targetOverride)
  }

  const swap0ForExact1: SwapFunction = (amount, to, sqrtPriceLimitX96, targetOverride) => {
    return swap(token0, [0, amount], to, sqrtPriceLimitX96, targetOverride)
  }

  const swapExact1For0: SwapFunction = (amount, to, sqrtPriceLimitX96, targetOverride) => {
    return swap(token1, [amount, 0], to, sqrtPriceLimitX96, targetOverride)
  }

  const swap1ForExact0: SwapFunction = (amount, to, sqrtPriceLimitX96, targetOverride) => {
    return swap(token1, [0, amount], to, sqrtPriceLimitX96, targetOverride)
  }

  const mint: MintFunction = async (tickLower, tickUpper, liquidity, targetContractOverride) => {
    const target = !!targetContractOverride ? targetContractOverride : swapTarget

    await token0.approve(target.address, constants.MaxUint256)
    await token1.approve(target.address, constants.MaxUint256)

    return target.mint(pool.address, tickLower, tickUpper, liquidity)
  }

  const burn: BurnFunction = async (tickLower, tickUpper, amount, targetContractOverride) => {
    const target = !!targetContractOverride ? targetContractOverride : swapTarget
    return target.burn(pool.address, tickLower, tickUpper, amount)
  }

  const collect: CollectFunction = async (
    recipient,
    tickLower,
    tickUpper,
    amount0Requested,
    amount1Requested,
    targetContractOverride
  ) => {
    const target = !!targetContractOverride ? targetContractOverride : swapTarget
    return target.collect(pool.address, recipient, tickLower, tickUpper, amount0Requested, amount1Requested)
  }

  return {
    swapToLowerPrice,
    swapToHigherPrice,
    swapExact0For1,
    swap0ForExact1,
    swapExact1For0,
    swap1ForExact0,
    mint,
    burn,
    collect,
  }
}

export interface MultiPoolFunctions {
  swapForExact0Multi: SwapFunction
  swapForExact1Multi: SwapFunction
}

export function createMultiPoolFunctions({
  inputToken,
  swapTarget,
  poolInput,
  poolOutput,
}: {
  inputToken: TestERC20
  swapTarget: TestMauveRouter
  poolInput: MockTimeMauvePool
  poolOutput: MockTimeMauvePool
}): MultiPoolFunctions {
  async function swapForExact0Multi(amountOut: BigNumberish, to: Wallet | string): Promise<ContractTransaction> {
    const method = swapTarget.swapForExact0Multi
    await inputToken.approve(swapTarget.address, constants.MaxUint256)
    const toAddress = typeof to === 'string' ? to : to.address
    return method(toAddress, poolInput.address, poolOutput.address, amountOut)
  }

  async function swapForExact1Multi(amountOut: BigNumberish, to: Wallet | string): Promise<ContractTransaction> {
    const method = swapTarget.swapForExact1Multi
    await inputToken.approve(swapTarget.address, constants.MaxUint256)
    const toAddress = typeof to === 'string' ? to : to.address
    return method(toAddress, poolInput.address, poolOutput.address, amountOut)
  }

  return {
    swapForExact0Multi,
    swapForExact1Multi,
  }
}
