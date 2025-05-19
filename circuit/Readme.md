## Generate Solidity Verifier

```
nargo compile
bb write_vk -b ./target/zk_votes.json -o ./target --oracle_hash keccak
bb write_solidity_verifier -k ./target/vk -o ./target/Verifier.sol
```