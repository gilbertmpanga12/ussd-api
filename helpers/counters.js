require('dotenv').config();
const firebase = require('firebase-admin');
const environment = process.env;

async function incrementsingleBulkTransactionCounter(amount){
    try{
    const increment =  firebase.firestore.FieldValue.increment(parseInt(amount));
    await firebase.firestore().collection('singleBulkTransactionCount')
    .doc(environment.uid).update({singleBulkTransactionCount: increment});
    }catch(e){
        console.log('FIREBASE incrementsingleBulkTransactionCounter');
        console.log(e);
    }
}


async function incrementTransactionCounter(transactionRef){
    try{
    const increment =  firebase.firestore.FieldValue.increment(1);
    await firebase.firestore().collection('transactionCount')
    .doc(environment.uid).update({transactionCount: increment, transactionRef: transactionRef});
    }catch(e){
        console.log('FIREBASE INCREMENTTRANSACTION COUNTER');
        console.log(e);
    }
}

async function checkDisbursementErrorCount(){
   return await firebase.firestore().collection('disbursementErrorCount')
   .doc(environment.uid).get(); 
}

async function resetDisbursementErrorCount(){
    await firebase.firestore().collection('disbursementErrorCount')
    .doc(environment.uid).set({disbursementErrorCount: 1});
}

async function disbursementErrorCount(){
    try{
    const increment =  firebase.firestore.FieldValue.increment(1);
    await firebase.firestore().collection('disbursementErrorCount')
    .doc(environment.uid).update({disbursementErrorCount: increment});
    }catch(e){
        console.log('FAILED TO INCREMENT DISBURSEMENT ERROR COUNT');
        console.log(e);
    }
}

// For for manual transaction
async function  fundsCollectedCounter(amount){
    try{
        const increment =  firebase.firestore.FieldValue.increment(parseInt(amount) + 500);
    await firebase.firestore().collection('fundsCollectedCount')
    .doc(environment.uid).update({fundsCollectedCount: increment});
    }catch(e){
        console.log('FIREBASE FUNDS COLLECTED USSD INCREMENT');
        console.log(e);
    }
}



async function reduceAmountCollected(amount){
    try{
        const decrement =  firebase.firestore.FieldValue.increment(-(amount));
        const fundsAvailableCount = await firebase.firestore().collection('fundsAvailableCount')
        .doc(environment.uid).get();
        if(fundsAvailableCount.data().fundsAvailableCount < 0){
            await firebase.firestore().collection('fundsAvailableCount')
            .doc(environment.uid).update({fundsAvailableCount: 0});
        }else{
            await firebase.firestore().collection('fundsAvailableCount')
    .doc(environment.uid).update({fundsAvailableCount: decrement});
        }
    
    }catch(e){
        console.log('FIREBASE INCREMENTTRANSACTION COUNTER');
        console.log(e);

    }
}

async function checkForBalance() {
    const fundsAvailable = await firebase.firestore().collection('fundsAvailableCount')
    .doc(environment.uid).get();
    return fundsAvailable;
}

async function loadFloatBalance(amount){
    const increment =  firebase.firestore.FieldValue.increment(parseInt(amount));
    const accountBalance = await firebase.firestore()
    .collection('fundsAvailableCount').doc(environment.uid).update({fundsAvailableCount:increment});
    return accountBalance;
}



module.exports = {checkForBalance, reduceAmountCollected, fundsCollectedCounter, 
incrementsingleBulkTransactionCounter, incrementTransactionCounter, loadFloatBalance, checkDisbursementErrorCount, 
resetDisbursementErrorCount, disbursementErrorCount};