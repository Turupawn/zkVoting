use dep::std;

fn main(root : pub Field,
        index: Field,
        priv_key: Field,
        note_hash_path: [Field; 2],
        proposalId: pub Field,
        vote: pub Field) -> pub Field
{
    let leaf = std::hash::pedersen_hash([priv_key]);
    let nullifier = std::hash::pedersen_hash([root, priv_key, proposalId]);
    let computedRoot = std::merkle::compute_merkle_root(leaf, index, note_hash_path);
    assert(root == computedRoot);
    nullifier
}