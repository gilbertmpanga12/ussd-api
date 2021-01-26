require('dotenv').config();
const firebase = require('firebase-admin');
const environment = process.env;

async function incrementsingleBulkTransactionCounter(amount, firebaseUser){
    try{
    const increment =  firebase.firestore.FieldValue.increment(parseInt(amount));
    await firebase.firestore().collection('singleBulkTransactionCount')
    .doc(firebaseUser).update({singleBulkTransactionCount: increment});
    }catch(e){
        console.log('FIREBASE incrementsingleBulkTransactionCounter');
        console.log(e);
    }
}


async function incrementTransactionCounter(transactionRef, firebaseUser){
    try{
    const increment =  firebase.firestore.FieldValue.increment(1);
    await firebase.firestore().collection('transactionCount')
    .doc(firebaseUser).update({transactionCount: increment, transactionRef: transactionRef});
    }catch(e){
        console.log('FIREBASE INCREMENTTRANSACTION COUNTER');
        console.log(e);
    }
}

async function checkDisbursementErrorCount(firebaseUser){
   return await firebase.firestore().collection('disbursementErrorCount')
   .doc(firebaseUser).get(); 
}

async function resetDisbursementErrorCount(firebaseUser){
    await firebase.firestore().collection('disbursementErrorCount')
    .doc(firebaseUser).set({disbursementErrorCount: 1});
}

async function clearNotificationCounter(firebaseUser){
    await firebase.firestore().collection('disbursementErrorCount')
    .doc(firebaseUser).set({disbursementErrorCount: 0});
}

async function disbursementErrorCount(count, firebaseUser){
    try{
    const increment =  firebase.firestore.FieldValue.increment(count);
    await firebase.firestore().collection('disbursementErrorCount')
    .doc(firebaseUser).update({disbursementErrorCount: increment});
    }catch(e){
        console.log('FAILED TO INCREMENT DISBURSEMENT ERROR COUNT');
        console.log(e);
    }
}

async function reduceDisbursementErrorCount(count, firebaseUser){
    try{
    const decrement =  firebase.firestore.FieldValue.increment(-count);
    await firebase.firestore().collection('disbursementErrorCount')
    .doc(firebaseUser).update({disbursementErrorCount: decrement});
    }catch(e){
        console.log('FAILED TO REDUCE DISBURSEMENT ERROR COUNT');
        console.log(e);
    }
}

// For for manual transaction
async function  fundsCollectedCounter(amount, firebaseUser){
    try{
        const increment =  firebase.firestore.FieldValue.increment(parseInt(amount) + 500);
    await firebase.firestore().collection('fundsCollectedCount')
    .doc(firebaseUser).update({fundsCollectedCount: increment});
    }catch(e){
        console.log('FIREBASE FUNDS COLLECTED USSD INCREMENT');
        console.log(e);
    }
}



async function reduceAmountCollected(amount, firebaseUser){
    try{
        const decrement =  firebase.firestore.FieldValue.increment(-(amount));
        const fundsAvailableCount = await firebase.firestore().collection('fundsAvailableCount')
        .doc(firebaseUser).get();
        if(fundsAvailableCount.data().fundsAvailableCount < 0){
            await firebase.firestore().collection('fundsAvailableCount')
            .doc(firebaseUser).update({fundsAvailableCount: 0});
        }else{
            await firebase.firestore().collection('fundsAvailableCount')
    .doc(firebaseUser).update({fundsAvailableCount: decrement});
        }
    
    }catch(e){
        console.log('FIREBASE INCREMENTTRANSACTION COUNTER');
        console.log(e);

    }
}

async function checkForBalance(firebaseUser) {
    const fundsAvailable = await firebase.firestore().collection('fundsAvailableCount')
    .doc(firebaseUser).get();
    return fundsAvailable;
}

async function loadFloatBalance(amount, firebaseUser){
    const increment =  firebase.firestore.FieldValue.increment(parseInt(amount));
    const accountBalance = await firebase.firestore()
    .collection('fundsAvailableCount').doc(firebaseUser).update({fundsAvailableCount:increment});
    return accountBalance;
}



module.exports = {checkForBalance, reduceAmountCollected, fundsCollectedCounter, 
incrementsingleBulkTransactionCounter, incrementTransactionCounter, loadFloatBalance, checkDisbursementErrorCount, 
resetDisbursementErrorCount, disbursementErrorCount, reduceDisbursementErrorCount, clearNotificationCounter};