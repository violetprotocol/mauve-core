import { HardhatEthersHelpers } from '@nomiclabs/hardhat-ethers/types'
import { Contract, ContractFactory } from 'ethers'
import { Network } from 'hardhat/types'

import { calcGas } from './utils'

export const deploy = async (ethers: HardhatEthersHelpers, artifact: string, ...params: Array<any>) => {
  const factory: ContractFactory = <ContractFactory>await ethers.getContractFactory(artifact)
  let contract: Contract

  if (params) contract = await factory.deploy(...params)
  else contract = await factory.deploy()

  return await contract.deployed()
}
