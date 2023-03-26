# Mauve Core

[![Lint](https://github.com/violetprotocol/mauve-core/actions/workflows/lint.yml/badge.svg)](https://github.com/violetprotocol/mauve-core/actions/workflows/lint.yml)
[![Tests](https://github.com/violetprotocol/mauve-core/actions/workflows/tests.yml/badge.svg)](https://github.com/violetprotocol/mauve-core/actions/workflows/tests.yml)
[![Fuzz Testing](https://github.com/violetprotocol/mauve-core/actions/workflows/fuzz-testing.yml/badge.svg)](https://github.com/violetprotocol/mauve-core/actions/workflows/fuzz-testing.yml)
[![Mythx](https://github.com/violetprotocol/mauve-core/actions/workflows/mythx.yml/badge.svg)](https://github.com/violetprotocol/mauve-core/actions/workflows/mythx.yml)
[![npm version](https://img.shields.io/npm/v/@violetprotocol/mauve-core/latest.svg)](https://www.npmjs.com/package/@violetprotocol/mauve-core/v/latest)

This repository contains the core smart contracts for the Mauve Protocol.
For higher level contracts, see the [mauve-periphery](https://github.com/violetprotocol/mauve-periphery)
repository.

## Local deployment

In order to deploy this code to a local testnet, you should install the npm package
`@violetprotocol/mauve-core`
and import the factory bytecode located at
`@violetprotocol/mauve-core/artifacts/contracts/MauveFactory.sol/MauveFactory.json`.
For example:

```typescript
import {
  abi as FACTORY_ABI,
  bytecode as FACTORY_BYTECODE,
} from '@violetprotocol/mauve-core/artifacts/contracts/MauveFactory.sol/MauveFactory.json'

// deploy the bytecode
```

This will ensure that you are testing against the same bytecode that is deployed to
mainnet and public testnets, and all Mauve code will correctly interoperate with
your local deployment.

## Using solidity interfaces

The Mauve interfaces are available for import into solidity smart contracts
via the npm artifact `@violetprotocol/mauve-core`, e.g.:

```solidity
import '@violetprotocol/mauve-core/contracts/interfaces/IMauvePool.sol';

contract MyContract {
  IMauvePool pool;

  function doSomethingWithPool() {
    // pool.swap(...);
  }
}

```

## Licensing

The primary license for Mauve Core is the Business Source License 1.1 (`BUSL-1.1`), see [`LICENSE`](./LICENSE).

### Exceptions

- All files in `contracts/interfaces/` are licensed under `GPL-2.0-or-later` (as indicated in their SPDX headers), see [`contracts/interfaces/LICENSE`](./contracts/interfaces/LICENSE)
- Several files in `contracts/libraries/` are licensed under `GPL-2.0-or-later` (as indicated in their SPDX headers), see [`contracts/libraries/LICENSE_GPL`](contracts/libraries/LICENSE_GPL)
- `contracts/libraries/FullMath.sol` is licensed under `MIT` (as indicated in its SPDX header), see [`contracts/libraries/LICENSE_MIT`](contracts/libraries/LICENSE_MIT)
- All files in `contracts/test` remain unlicensed.
