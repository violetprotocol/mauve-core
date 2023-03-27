import { BigNumber } from 'ethers'
import { ethers } from 'hardhat'
import { MockTimeMauvePool } from '../../typechain/MockTimeMauvePool'
import { TestERC20 } from '../../typechain/TestERC20'
import { MauveFactory } from '../../typechain/MauveFactory'
import { TestMauveCallee } from '../../typechain/TestMauveCallee'
import { TestMauveRouter } from '../../typechain/TestMauveRouter'
import { MockTimeMauvePoolDeployer } from '../../typechain/MockTimeMauvePoolDeployer'

import { Fixture } from 'ethereum-waffle'
import { positionManagerBytes32, swapRouterBytes32 } from './roles'

interface FactoryFixture {
  factory: MauveFactory
}

async function factoryFixture(): Promise<FactoryFixture> {
  const factoryFactory = await ethers.getContractFactory('MauveFactory')
  const factory = (await factoryFactory.deploy()) as MauveFactory
  return { factory }
}

interface TokensFixture {
  token0: TestERC20
  token1: TestERC20
  token2: TestERC20
}

async function tokensFixture(): Promise<TokensFixture> {
  const tokenFactory = await ethers.getContractFactory('TestERC20')
  const tokenA = (await tokenFactory.deploy(BigNumber.from(2).pow(255))) as TestERC20
  const tokenB = (await tokenFactory.deploy(BigNumber.from(2).pow(255))) as TestERC20
  const tokenC = (await tokenFactory.deploy(BigNumber.from(2).pow(255))) as TestERC20

  const [token0, token1, token2] = [tokenA, tokenB, tokenC].sort((tokenA, tokenB) =>
    tokenA.address.toLowerCase() < tokenB.address.toLowerCase() ? -1 : 1
  )

  return { token0, token1, token2 }
}

type TokensAndFactoryFixture = FactoryFixture & TokensFixture

interface PoolFixture extends TokensAndFactoryFixture {
  swapTargetCallee: TestMauveCallee
  swapTargetRouter: TestMauveRouter
  createPool(
    fee: number,
    tickSpacing: number,
    firstToken?: TestERC20,
    secondToken?: TestERC20
  ): Promise<MockTimeMauvePool>
}

// Monday, October 5, 2020 9:00:00 AM GMT-05:00
export const TEST_POOL_START_TIME = 1601906400

export const poolFixture: Fixture<PoolFixture> = async function (): Promise<PoolFixture> {
  const { factory } = await factoryFixture()
  const { token0, token1, token2 } = await tokensFixture()

  const MockTimeMauvePoolDeployerFactory = await ethers.getContractFactory('MockTimeMauvePoolDeployer')
  const MockTimeMauvePoolFactory = await ethers.getContractFactory('MockTimeMauvePool')

  const calleeContractFactory = await ethers.getContractFactory('TestMauveCallee')
  const routerContractFactory = await ethers.getContractFactory('TestMauveRouter')

  const swapTargetCallee = (await calleeContractFactory.deploy()) as TestMauveCallee
  const swapTargetRouter = (await routerContractFactory.deploy()) as TestMauveRouter

  // Set positionManager address
  await factory.setRole(swapTargetCallee.address, positionManagerBytes32)
  // Set swapRouter address
  await factory.setRole(swapTargetCallee.address, swapRouterBytes32)

  return {
    token0,
    token1,
    token2,
    factory,
    swapTargetCallee,
    swapTargetRouter,
    createPool: async (fee, tickSpacing, firstToken = token0, secondToken = token1) => {
      const mockTimePoolDeployer = (await MockTimeMauvePoolDeployerFactory.deploy()) as MockTimeMauvePoolDeployer
      const tx = await mockTimePoolDeployer.deploy(
        factory.address,
        firstToken.address,
        secondToken.address,
        fee,
        tickSpacing
      )

      const receipt = await tx.wait()
      const poolAddress = receipt.events?.[0].args?.pool as string
      return MockTimeMauvePoolFactory.attach(poolAddress) as MockTimeMauvePool
    },
  }
}
