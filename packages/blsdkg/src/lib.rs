use std::{collections::BTreeMap, convert::TryInto};

use blsdkg::{
    ff::Field,
    fr_from_be_bytes, hash_g2,
    poly::{BivarPoly, Commitment, Poly},
    PublicKeySet, SecretKey, SecretKeyShare, PK_SIZE, SK_SIZE,
};

use js_sys::Uint8Array;
use pairing::bls12_381::Fr;
use wasm_bindgen::prelude::*;

// this method use macro to copy fixed size array
fn from_bytes(bytes: &[u8]) -> Uint8Array {
    let buffer = Uint8Array::new_with_length(bytes.len() as u32);
    buffer.copy_from(bytes);
    buffer
}

#[wasm_bindgen]
pub fn sign(sk: Uint8Array, msg: Uint8Array) -> Option<Uint8Array> {
    let mut sk_bytes: [u8; SK_SIZE] = [0; SK_SIZE];
    sk.copy_to(&mut sk_bytes);
    // create secret key vec from input parameters
    let sk = match SecretKeyShare::from_bytes(sk_bytes) {
        Ok(s) => s,
        Err(_) => return None,
    };

    Some(from_bytes(&sk.sign(msg.to_vec()).to_bytes()))
}

#[wasm_bindgen]
pub struct KeyShare {
    sk: SecretKeyShare,
}

#[wasm_bindgen]
impl KeyShare {
    pub fn get_pk(&self) -> Uint8Array {
        from_bytes(&self.sk.public_key_share().to_bytes())
    }

    // this method is use for sign_g2 like dran
    pub fn sign_g2(&self, input: Uint8Array, round: u64) -> Uint8Array {
        let mut msg = input.to_vec();
        msg.extend(&round.to_be_bytes());
        from_bytes(&self.sk.sign_g2(hash_g2(msg)).to_bytes())
    }

    pub fn to_bytes(&self) -> Uint8Array {
        from_bytes(&self.sk.to_bytes())
    }
}

#[wasm_bindgen]
pub fn get_sk_share(rows: Vec<Uint8Array>, commits: Vec<Uint8Array>) -> Option<KeyShare> {
    let mut sec_key = Fr::zero();
    for (row, commit) in rows.iter().zip(commits) {
        // Node `m` receives its row and verifies it.
        // it must be encrypted with public key
        let row_poly = Poly::from_bytes(row.to_vec()).unwrap();

        // send row_poly with encryption to node m
        // also send commit for each node to verify row_poly share
        let row_commit = Commitment::from_bytes(commit.to_vec()).unwrap();
        // verify share
        if row_poly.commitment().ne(&row_commit) {
            return None;
        }

        // then update share row encrypted with public key, for testing we store plain share
        // this will be done in wasm bindgen
        let sec_commit = row_poly.evaluate(0);
        // combine all sec_commit from all dealers

        sec_key.add_assign(&sec_commit);
    }

    // now can share secret pubkey for contract to verify
    let sk = SecretKeyShare::from_mut(&mut sec_key);

    Some(KeyShare { sk })
}

#[wasm_bindgen]
pub struct Share {
    commits: Vec<Commitment>,
    rows: Vec<Poly>,
}

#[wasm_bindgen]
impl Share {
    pub fn get_commits(&self) -> Vec<Uint8Array> {
        self.commits
            .iter()
            .map(|i| Uint8Array::from(i.to_bytes().as_slice()))
            .collect()
    }

    pub fn get_rows(&self) -> Vec<Uint8Array> {
        self.rows
            .iter()
            .map(|i| Uint8Array::from(i.to_bytes().as_slice()))
            .collect()
    }
}

// fills BIVAR_ROW_BYTES and BIVAR_COMMITMENT_BYTES
// with the required number of rows and commitments,
// although not all are necessarily going to be used.
// Values are concatenated into the BYTES vectors.
#[wasm_bindgen]
pub fn generate_bivars(degree: usize, total_nodes: usize) -> Share {
    let mut commits = vec![];
    let mut rows = vec![];

    let mut rng = rand::thread_rng();
    let bi_poly = BivarPoly::random(degree, &mut rng);

    let bi_commit = bi_poly.commitment();

    commits.push(bi_commit.row(0));
    for i in 1..=total_nodes {
        rows.push(bi_poly.row(i));
        commits.push(bi_commit.row(i));
    }

    // create new instance
    Share { commits, rows }
}

#[wasm_bindgen]
pub fn get_public_key(commits: Vec<Uint8Array>) -> Uint8Array {
    let mut sum_commit = Poly::zero().commitment();
    for commit in commits {
        let row_commit = Commitment::from_bytes(commit.to_vec()).unwrap();
        sum_commit += row_commit;
    }
    let mpkset = PublicKeySet::from(sum_commit);
    from_bytes(&mpkset.public_key().to_bytes())
}

#[wasm_bindgen]
pub fn get_pk(priv_key: Uint8Array) -> Uint8Array {
    let secret_key =
        SecretKey::from_bytes(vec_to_array(priv_key.to_vec())).expect("error from bytes");
    let public_key = secret_key.public_key();
    from_bytes(&public_key.to_bytes())
}

#[wasm_bindgen]
pub fn interpolate(indexes: Vec<Uint8Array>, shares: Vec<Uint8Array>) -> Uint8Array {
    let shares_fr: Vec<Fr> = shares
        .iter()
        .map(|s| fr_from_be_bytes(vec_to_array(s.to_vec())).unwrap())
        .collect();

    let indexes_fr: Vec<u64> = indexes.into_iter().map(uint8_array_to_u64).collect();

    let mut input = BTreeMap::new();
    for index in 0..indexes_fr.len() {
        input.insert(indexes_fr[index], shares_fr[index]);
    }
    let poly = Poly::interpolate(input);
    let sk = SecretKey::from_mut(&mut poly.evaluate(0));

    from_bytes(&sk.to_bytes())
}

fn uint8_array_to_u64(s: Uint8Array) -> u64 {
    let mut s = s.to_vec();
    s.extend(vec![0; 8 - s.len()]);
    s = s.into_iter().rev().collect();
    let s_len_8: [u8; 8] = s[..].try_into().unwrap();
    u64::from_be_bytes(s_len_8)
}

fn vec_to_array(vec: Vec<u8>) -> [u8; 32] {
    vec.try_into()
        .unwrap_or_else(|v: Vec<u8>| panic!("Expected a Vec of length 32 but it was {}", v.len()))
}

fn hex_to_fr(hex: &str) -> Fr {
    let decoded = hex::decode(hex).expect("Decode fail");
    fr_from_be_bytes(decoded.try_into().unwrap()).unwrap()
}

#[cfg(test)]
mod tests {

    use std::{collections::BTreeMap, ops::AddAssign};

    use super::*;
    use wasm_bindgen_test::*;

    #[wasm_bindgen_test]
    fn test_bivars_interpolate() {
        let node_num = 5;
        let dealer_num = 3;
        let faulty_num = 2;
        let mut sum_commit = Poly::zero().commitment();
        let mut sec_keys = vec![Fr::zero(); node_num];
        let mut sk = Fr::zero();

        let mut rng = rand::thread_rng();
        let bi_polys: Vec<BivarPoly> = (0..dealer_num)
            .map(|_| BivarPoly::random(faulty_num, &mut rng))
            .collect();

        for bi_poly in bi_polys {
            let bi_commit = bi_poly.commitment();

            for m in 1..=node_num {
                let sec_commit = bi_poly.evaluate(m, 0);
                sec_keys[m - 1].add_assign(&sec_commit);
                console_log!("{:?}", sec_commit);
            }
            sk.add_assign(&bi_poly.evaluate(0, 0));
            sum_commit.add_assign(bi_commit.row(0));
        }
        let received: BTreeMap<_, _> = (0..=faulty_num + 1)
            .into_iter()
            .map(|i| (i + 1, sec_keys[i]))
            .collect();
        let poly = Poly::interpolate(received);
        let mut retrieved_sk = poly.evaluate(0);
        assert_eq!(sk, retrieved_sk);

        console_log!("{:?}", &sum_commit.to_bytes());
        let mpkset = PublicKeySet::from(sum_commit);
        let pk = mpkset.public_key();
        let retrieved_sk = SecretKey::from_mut(&mut retrieved_sk);
        assert_eq!(pk, retrieved_sk.public_key());
    }
}
