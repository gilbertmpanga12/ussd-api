const firebase = require("firebase-admin");

async function setBalance(customerReferenceId, balanceDetails){
    return await firebase.firestore()
    .collection('loanbalance')
    .doc(customerReferenceId)
    .set(balanceDetails, {merge: true});
}



async function getBalance(customerReferenceId){
    return await firebase.firestore()
    .collection('loanbalance')
    .doc(customerReferenceId).get();
}

module.exports = {setBalance, getBalance};