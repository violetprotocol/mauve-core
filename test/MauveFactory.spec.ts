import { ethers, waffle } from 'hardhat'
import { MauveFactory } from '../typechain/MauveFactory'
import { expect } from './shared/expect'
import snapshotGasCost from './shared/snapshotGasCost'

import { FeeAmount, getCreate2Address, TICK_SPACINGS } from './shared/utilities'
import { ownerBytes32, swapRouterBytes32, positionManagerBytes32, poolAdminBytes32 } from './shared/roles'
import { BigNumber } from 'ethers'

const { constants } = ethers

const TEST_ADDRESSES: [string, string] = [
  '0x1000000000000000000000000000000000000000',
  '0x2000000000000000000000000000000000000000',
]

const createFixtureLoader = waffle.createFixtureLoader

describe('MauveFactory', () => {
  const [wallet, other] = waffle.provider.getWallets()

  let factory: MauveFactory
  let poolBytecode: string
  const fixture = async () => {
    const factoryFactory = await ethers.getContractFactory('MauveFactory')
    return (await factoryFactory.deploy()) as MauveFactory
  }

  let loadFixture: ReturnType<typeof createFixtureLoader>
  before('create fixture loader', async () => {
    loadFixture = createFixtureLoader([wallet, other])
  })

  before('load pool bytecode', async () => {
    poolBytecode = (await ethers.getContractFactory('MauvePool')).bytecode
  })

  beforeEach('deploy factory', async () => {
    factory = await loadFixture(fixture)
  })

  it('owner is deployer', async () => {
    expect(await factory.roles(ownerBytes32)).to.eq(wallet.address)
  })

  it('factory bytecode size', async () => {
    expect(((await waffle.provider.getCode(factory.address)).length - 2) / 2).to.matchSnapshot()
  })

  it('pool bytecode size', async () => {
    await factory.createPool(TEST_ADDRESSES[0], TEST_ADDRESSES[1], FeeAmount.MEDIUM)
    const poolAddress = getCreate2Address(factory.address, TEST_ADDRESSES, FeeAmount.MEDIUM, poolBytecode)
    expect(((await waffle.provider.getCode(poolAddress)).length - 2) / 2).to.matchSnapshot()
  })

  it('initial enabled fee amounts', async () => {
    expect(await factory.feeAmountTickSpacing(FeeAmount.LOW)).to.eq(TICK_SPACINGS[FeeAmount.LOW])
    expect(await factory.feeAmountTickSpacing(FeeAmount.MEDIUM)).to.eq(TICK_SPACINGS[FeeAmount.MEDIUM])
    expect(await factory.feeAmountTickSpacing(FeeAmount.HIGH)).to.eq(TICK_SPACINGS[FeeAmount.HIGH])
  })

  async function createAndCheckPool(
    tokens: [string, string],
    feeAmount: FeeAmount,
    tickSpacing: number = TICK_SPACINGS[feeAmount]
  ) {
    const create2Address = getCreate2Address(factory.address, tokens, feeAmount, poolBytecode)
    const create = factory.createPool(tokens[0], tokens[1], feeAmount)

    await expect(create)
      .to.emit(factory, 'PoolCreated')
      .withArgs(TEST_ADDRESSES[0], TEST_ADDRESSES[1], feeAmount, tickSpacing, create2Address)

    await expect(factory.createPool(tokens[0], tokens[1], feeAmount)).to.be.reverted
    await expect(factory.createPool(tokens[1], tokens[0], feeAmount)).to.be.reverted
    expect(await factory.getPool(tokens[0], tokens[1], feeAmount), 'getPool in order').to.eq(create2Address)
    expect(await factory.getPool(tokens[1], tokens[0], feeAmount), 'getPool in reverse').to.eq(create2Address)

    const poolContractFactory = await ethers.getContractFactory('MauvePool')
    const pool = poolContractFactory.attach(create2Address)
    expect(await pool.factory(), 'pool factory address').to.eq(factory.address)
    expect(await pool.token0(), 'pool token0').to.eq(TEST_ADDRESSES[0])
    expect(await pool.token1(), 'pool token1').to.eq(TEST_ADDRESSES[1])
    expect(await pool.fee(), 'pool fee').to.eq(feeAmount)
    expect(await pool.tickSpacing(), 'pool tick spacing').to.eq(tickSpacing)
  }

  describe('#createPool', () => {
    it('succeeds for low fee pool', async () => {
      await createAndCheckPool(TEST_ADDRESSES, FeeAmount.LOW)
    })

    it('succeeds for medium fee pool', async () => {
      await createAndCheckPool(TEST_ADDRESSES, FeeAmount.MEDIUM)
    })
    it('succeeds for high fee pool', async () => {
      await createAndCheckPool(TEST_ADDRESSES, FeeAmount.HIGH)
    })

    it('succeeds if tokens are passed in reverse', async () => {
      await createAndCheckPool([TEST_ADDRESSES[1], TEST_ADDRESSES[0]], FeeAmount.MEDIUM)
    })

    it('fails if token a == token b', async () => {
      await expect(factory.createPool(TEST_ADDRESSES[0], TEST_ADDRESSES[0], FeeAmount.LOW)).to.be.reverted
    })

    it('fails if token a is 0 or token b is 0', async () => {
      await expect(factory.createPool(TEST_ADDRESSES[0], constants.AddressZero, FeeAmount.LOW)).to.be.reverted
      await expect(factory.createPool(constants.AddressZero, TEST_ADDRESSES[0], FeeAmount.LOW)).to.be.reverted
      await expect(factory.createPool(constants.AddressZero, constants.AddressZero, FeeAmount.LOW)).to.be.revertedWith(
        ''
      )
    })

    it('fails if fee amount is not enabled', async () => {
      await expect(factory.createPool(TEST_ADDRESSES[0], TEST_ADDRESSES[1], 250)).to.be.reverted
    })

    it('it is not reverted with sensible params', async () => {
      await expect(factory.createPool(TEST_ADDRESSES[0], TEST_ADDRESSES[1], FeeAmount.MEDIUM)).to.not.be.reverted
    })

    it('fails if create pool is called from non pool-admin', async () => {
      await expect(
        factory.connect(other).createPool(TEST_ADDRESSES[0], TEST_ADDRESSES[1], FeeAmount.MEDIUM)
      ).to.be.revertedWith('OPA')
    })

    it('succeeds if pool admin gets changed before createPool is called', async () => {
      await factory.setRole(other.address, poolAdminBytes32)
      await expect(factory.connect(other).createPool(TEST_ADDRESSES[0], TEST_ADDRESSES[1], FeeAmount.MEDIUM)).to.not.be
        .reverted
    })

    it('gas', async () => {
      await snapshotGasCost(factory.createPool(TEST_ADDRESSES[0], TEST_ADDRESSES[1], FeeAmount.MEDIUM))
    })
  })

  describe('#setPoolAdmin', () => {
    it('fails if caller is not owner', async () => {
      await expect(factory.connect(other).setRole(other.address, poolAdminBytes32)).to.be.revertedWith('OO')
    })

    it('updates poolAdmin can be called by owner', async () => {
      await expect(factory.setRole(other.address, poolAdminBytes32)).to.not.be.reverted
    })

    it('poolAdmin is returned correctly after setPoolAdmin', async () => {
      await factory.setRole(other.address, poolAdminBytes32)
      expect(await factory.roles(poolAdminBytes32)).to.eq(other.address)
    })

    it('can be called by original owner after new pool admin is set', async () => {
      await factory.setRole(other.address, poolAdminBytes32)
      await expect(factory.setRole(wallet.address, poolAdminBytes32)).to.not.be.reverted
    })

    it('cannot be called by previous owner after owner has changed', async () => {
      await factory.setRole(other.address, ownerBytes32)
      await expect(factory.setRole(wallet.address, poolAdminBytes32)).to.be.revertedWith('OO')
    })

    it('can be called by new owner after owner has changed', async () => {
      await factory.setRole(other.address, ownerBytes32)
      await expect(factory.connect(other).setRole(wallet.address, poolAdminBytes32)).to.not.be.reverted
    })
  })

  describe('#setSwapRouter', () => {
    it('fails if caller is not owner', async () => {
      await expect(factory.connect(other).setRole(other.address, swapRouterBytes32)).to.be.revertedWith('OO')
    })

    it('setSwapRouter succeeds when called by owner', async () => {
      await expect(factory.setRole(other.address, swapRouterBytes32)).to.not.be.reverted
      expect(await factory.roles(swapRouterBytes32)).to.eq(other.address)
    })

    it('can be called by original owner after new swap router is set', async () => {
      await factory.setRole(other.address, swapRouterBytes32)
      await expect(factory.setRole(wallet.address, swapRouterBytes32)).to.not.be.reverted
      expect(await factory.roles(swapRouterBytes32)).to.eq(wallet.address)
    })

    it('cannot be called by previous owner after owner has changed', async () => {
      await factory.setRole(other.address, ownerBytes32)
      await expect(factory.setRole(wallet.address, swapRouterBytes32)).to.be.reverted
    })

    it('can be called by new owner after owner has changed', async () => {
      await factory.setRole(other.address, ownerBytes32)
      await expect(factory.connect(other).setRole(other.address, swapRouterBytes32)).to.not.be.reverted
      expect(await factory.roles(swapRouterBytes32)).to.eq(other.address)
    })
  })

  describe('#setPositionManager', () => {
    it('fails if caller is not owner', async () => {
      await expect(factory.connect(other).setRole(other.address, positionManagerBytes32)).to.be.revertedWith('OO')
    })

    it('setPositionManager succeeds when called by owner', async () => {
      await expect(factory.setRole(other.address, positionManagerBytes32)).to.not.be.reverted
      expect(await factory.roles(positionManagerBytes32)).to.eq(other.address)
    })

    it('can be called by original owner after new position manager is set', async () => {
      await factory.setRole(other.address, positionManagerBytes32)

      await expect(factory.setRole(wallet.address, positionManagerBytes32)).to.not.be.reverted
      expect(await factory.roles(positionManagerBytes32)).to.eq(wallet.address)
    })

    it('cannot be called by previous owner after owner has changed', async () => {
      await factory.setRole(other.address, ownerBytes32)
      await expect(factory.setRole(wallet.address, positionManagerBytes32)).to.be.reverted
    })

    it('can be called by new owner after owner has changed', async () => {
      await factory.setRole(other.address, ownerBytes32)
      await expect(factory.connect(other).setRole(other.address, positionManagerBytes32)).to.not.be.reverted
      expect(await factory.roles(positionManagerBytes32)).to.eq(other.address)
    })
  })

  describe('#setOwner', () => {
    it('fails if caller is not owner', async () => {
      await expect(factory.connect(other).setRole(wallet.address, ownerBytes32)).to.be.reverted
    })

    it('updates owner', async () => {
      await factory.setRole(other.address, ownerBytes32)
      expect(await factory.roles(ownerBytes32)).to.eq(other.address)
    })

    it('cannot be called by original owner', async () => {
      await factory.setRole(other.address, ownerBytes32)
      await expect(factory.setRole(wallet.address, ownerBytes32)).to.be.reverted
    })
  })

  describe('#enableFeeAmount', () => {
    it('fails if caller is not owner', async () => {
      await expect(factory.connect(other).enableFeeAmount(100, 2)).to.be.reverted
    })
    it('fails if fee is too great', async () => {
      await expect(factory.enableFeeAmount(1000000, 10)).to.be.reverted
    })
    it('fails if tick spacing is too small', async () => {
      await expect(factory.enableFeeAmount(500, 0)).to.be.reverted
    })
    it('fails if tick spacing is too large', async () => {
      await expect(factory.enableFeeAmount(500, 16834)).to.be.reverted
    })
    it('fails if already initialized', async () => {
      await factory.enableFeeAmount(100, 5)
      await expect(factory.enableFeeAmount(100, 10)).to.be.reverted
    })
    it('sets the fee amount in the mapping', async () => {
      await factory.enableFeeAmount(100, 5)
      expect(await factory.feeAmountTickSpacing(100)).to.eq(5)
    })
    it('emits an event', async () => {
      await expect(factory.enableFeeAmount(100, 5)).to.emit(factory, 'FeeAmountEnabled').withArgs(100, 5)
    })
    it('enables pool creation', async () => {
      await factory.enableFeeAmount(250, 15)
      await createAndCheckPool([TEST_ADDRESSES[0], TEST_ADDRESSES[1]], 250, 15)
    })
  })

  describe('#setMauveTokenIdsAllowedToInteract', () => {
    it('fails if caller is not owner', async () => {
      await expect(factory.connect(other).setMauveTokenIdsAllowedToInteract([0])).to.be.reverted

      expect(await factory.getMauveTokenIdsAllowedToInteract()).to.deep.equal([])
    })

    it('updates Violet ID Tokens approved for Mauve', async () => {
      await expect(factory.connect(wallet).setMauveTokenIdsAllowedToInteract([0])).to.not.be.reverted

      expect(await factory.getMauveTokenIdsAllowedToInteract()).to.deep.equal([BigNumber.from(0)])
    })
  })

  describe('#getMauveTokenIdsAllowedToInteract', () => {
    beforeEach('set Violet ID Tokens approved for Mauve', async () => {
      await expect(factory.connect(wallet).setMauveTokenIdsAllowedToInteract([0])).to.not.be.reverted
    })

    it('correctly returns Violet ID Tokens approved for Mauve', async () => {
      expect(await factory.getMauveTokenIdsAllowedToInteract()).to.deep.equal([BigNumber.from(0)])
    })
  })
})
