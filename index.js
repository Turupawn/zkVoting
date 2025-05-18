import { loadDapp, submitAdminProof, submitPlayerProof } from './web3_stuff.js';
import { generateProof, show, computeMerkleTree, generateMerkleProof, pedersenHashArray } from './zk_stuff.js';

// Initialize dapp
loadDapp();

document.getElementById("compute_merkle_hash").addEventListener("click", async () => {
    const leftLeaf = Math.floor(Math.random() * 1000) + 1;
    const rightLeaf = Math.floor(Math.random() * 1000) + 1;

    const leaves = [1, 2, 3, 4].map(n => BigInt(n));
    const { leaves: leavesWithPaths, root } = await computeMerkleTree(leaves);
    show("results", `Merkle Root: ${root}`);
    show("results", `Merkle Leaves: ${leavesWithPaths}`);
    console.log(root);
    console.log(leavesWithPaths);
});

document.getElementById("admin_submit").addEventListener("click", async () => {
  const word = document.getElementById("admin_word").value;
  const { proofBytes, publicInputs, rawProof } = await generateProof(
    word, 
    "0x0000000000000000000000000000000000000000"
  );
  
  await submitAdminProof(proofBytes, publicInputs);
  show("results", rawProof);
});

document.getElementById("player_submit").addEventListener("click", async () => {
  const word = document.getElementById("player_word").value;
  const winnerAddress = document.getElementById("winner-address").value;
  const { proofBytes, publicInputs, rawProof } = await generateProof(
    word,
    winnerAddress
  );
  
  await submitPlayerProof(proofBytes, publicInputs);
  show("results", rawProof);
});

document.getElementById("generate_merkle_proof").addEventListener("click", async () => {
  const { proofBytes, publicInputs, rawProof } = await generateMerkleProof();
  show("results", `Proof Bytes: ${proofBytes}`);
  show("results", `Public Inputs: ${JSON.stringify(publicInputs)}`);
  show("results", `Raw Proof: ${JSON.stringify(rawProof)}`);
});

document.getElementById("compute_hash").addEventListener("click", async () => {
  const input = document.getElementById("hash_input").value;
  try {
    const hash = await pedersenHashArray([input]);
    document.getElementById("hash_result").value = `0x${hash.toString(16)}`;
  } catch (error) {
    show("results", `Error: ${error.message}`);
  }
});

document.getElementById("compute_two_hash").addEventListener("click", async () => {
  const input1 = document.getElementById("hash_input1").value;
  const input2 = document.getElementById("hash_input2").value;
  try {
    const hash = await pedersenHashArray([input1, input2]);
    document.getElementById("two_hash_result").value = `0x${hash.toString(16)}`;
  } catch (error) {
    show("results", `Error: ${error.message}`);
  }
});

document.getElementById("compute_tree").addEventListener("click", async () => {
  const inputs = [
    document.getElementById("tree_input1").value,
    document.getElementById("tree_input2").value,
    document.getElementById("tree_input3").value,
    document.getElementById("tree_input4").value
  ];
  
  try {
    // Compute first level hashes
    const level1Hash1 = await pedersenHashArray([inputs[0], inputs[1]]);
    const level1Hash2 = await pedersenHashArray([inputs[2], inputs[3]]);
    
    // Compute root hash
    const rootHash = await pedersenHashArray([level1Hash1, level1Hash2]);
    
    // Format the tree visualization
    const tree = `└─ 0x${rootHash.toString(16)}
   ├─ 0x${level1Hash1.toString(16)}
   │  ├─ 0x${BigInt('0x' + inputs[0].replace(/0x/gi, '')).toString(16)}
   │  └─ 0x${BigInt('0x' + inputs[1].replace(/0x/gi, '')).toString(16)}
   └─ 0x${level1Hash2.toString(16)}
      ├─ 0x${BigInt('0x' + inputs[2].replace(/0x/gi, '')).toString(16)}
      └─ 0x${BigInt('0x' + inputs[3].replace(/0x/gi, '')).toString(16)}`;
    
    document.getElementById("tree_result").value = tree;
  } catch (error) {
    show("results", `Error: ${error.message}`);
  }
});