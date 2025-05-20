## Setup the circuits

Gnerate artifacts and solidity verifier

```
# cleanup exisitng artifacts
cd circuit
rm -rf target
# generate new verifier
nargo compile
bb write_vk -b ./target/zk_votes.json -o ./target --oracle_hash keccak
bb write_solidity_verifier -k ./target/vk -o ./target/Verifier.sol
```

## Load the frontend

Install npm (I recommend using [nvm](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating)) and [bunx](https://bun.sh/docs/installation) and then:

```
npm install
bunx vite
```

Now generate a new merkle tree and save the root of your 4 leaf merkle tree for later.

## Smart contracts

Deploy the newly generated `HonkVerifier` from `circuit/target/Verifier.sol` and also `zkVotes` from `contracts/zkVotes.sol` by passing the address of the verifier you just deployed and the root of your tree.

Now copy the address of `zkVotes` on top of the `web3_stuff.js`.

## Some resoruces to get you started

* [Noir official documentation](https://noir-lang.org/)
* [Official WASM proof example](https://noir-lang.org/docs/tutorials/noirjs_app)
* [Official contract verification example](https://github.com/saleel/noir-solidity-example/)
* [My noir end to end example](https://github.com/Turupawn/zk-hangman-noir)
