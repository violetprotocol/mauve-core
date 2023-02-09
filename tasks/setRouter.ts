import { task } from 'hardhat/config'
import { TaskArguments } from 'hardhat/types'

import { UniswapV3Factory, UniswapV3Factory__factory } from '../typechain'

task('factory:setRouter', 'Sets the router address at the factory contract')
  .addParam('factory', 'UniswapFactory address')
  .addParam('router', 'SwapRouter02 address')
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const uniswapFactoryFactory: UniswapV3Factory__factory = <UniswapV3Factory__factory>(
      await ethers.getContractFactory('UniswapV3Factory')
    )
    const uniswapFactory: UniswapV3Factory = <UniswapV3Factory>await uniswapFactoryFactory.attach(taskArguments.factory)
    await uniswapFactory.setSwapRouter(taskArguments.router)
  })
