require('dotenv').config();
const environment = process.env;
const firebase = require("firebase-admin");
const {
  incrementsingleBulkTransactionCounter,
  fundsCollectedCounter,reduceAmountCollected
} = require("./counters");
const axios = require('axios').default;
const {getBulkTransactionStatus, checkSingleBalanceStatus} = require('./balances');
const parseString = require('xml2js').parseString;
const {incrementTransactionCounter, checkDisbursementErrorCount, 
  resetDisbursementErrorCount, disbursementErrorCount, reduceDisbursementErrorCount, clearNotificationCounter} = require('./counters');


function status(transactionRef,
  amount,
  transactionInitiationDate,
  transactionType,
  phoneNumber,
  actualAmount, shortenTransactionRef) {
  checkSingleBalanceStatus(transactionRef).then(results => {
    console.log('checking single status');
    console.log(results.data);
    parseString(results.data, function (err, result) {
      const result_decode = result;
      const result_load = result_decode["AutoCreate"]["Response"][0];
      const status = result_load["Status"][0];
      console.log('STATUS CALLED');
      console.log(result_load);
      console.log(status);
      if (status == "OK") {
        const transactionRefMM = result_load["MNOTransactionReferenceId"][0];
        if (
          transactionType == "Manual Recovery"
        ) {
          fundsCollectedCounter(actualAmount);
          // reduceAmountCollected(actualAmount);
          updateStatus(shortenTransactionRef, transactionRefMM);
           return;
        }else{
          const amountWithCharge = parseInt(actualAmount) + 500;
          incrementsingleBulkTransactionCounter(amountWithCharge);
          reduceAmountCollected(amountWithCharge);
          updateStatus(shortenTransactionRef, transactionRefMM);
          return;
        }
      }
    });
    
  }).catch(err => {
    console.log('CHECK SINGLE TRANSACTION STATUS ERROR');
    console.log(err);
  });
}


function checkBulkStatus(transactionRef) {
  
  getBulkTransactionStatus(transactionRef).then(results => {
    console.log('checking bulk status');
    console.log(results.data);
    parseString(results.data, function (err, result) {
    const result_decode = result;
    const result_load = result_decode["AutoCreate"]["Response"][0];
    const status = result_load["Status"][0];
    console.log('STATUS CALLED');
    console.log(result_load);
    console.log(status);
    const paymentStatues = result_load['Beneficiaries'][0]['Beneficiary'];
    if (status == "OK") {
        const unsuccessfulPayments = paymentStatues.filter(transaction => transaction['Status'][0] === 'NOT PAID');
        const passedPayments = paymentStatues.filter(transaction => transaction['Status'][0] !== 'NOT PAID');
        const passedBulkPaymentsCount = passedPayments.length;
        const failedBulkPaymentsCount = unsuccessfulPayments.length;
        console.log(passedBulkPaymentsCount, failedBulkPaymentsCount);
        console.log(unsuccessfulPayments);
        console.log(passedPayments);
        if(passedPayments.length > 0){
          incrementTransactionCounter(transactionRef);
          const total = passedPayments.reduce((accumulator, currentValue) => accumulator + parseInt(currentValue['Amount'][0]),0);
          storeBulkTransaction(passedPayments);
          incrementsingleBulkTransactionCounter(total);
          reduceAmountCollected(total);
          reduceDisbursementErrorCount(passedBulkPaymentsCount);
        }

        if(unsuccessfulPayments.length > 0){
          storeFailedBulkTransactions(unsuccessfulPayments);
          checkDisbursementErrorCount().then((errorCount) => {
            if(errorCount.data() > 0 && errorCount.exists){
              disbursementErrorCount(failedBulkPaymentsCount);
              return;
            }

            if(errorCount.data() < 0 && errorCount.exists){
              resetDisbursementErrorCount();
              return;
            }

            resetDisbursementErrorCount();

          });
        }
      }
    });
    
  }).catch(err => {
    console.log('CHECK BULK TRANSACTION STATUS ERROR');
    console.log(err);
  });
}



async function saveTransaction(
  transactionRef,
  amount,
  transactionInitiationDate,
  transactionType,
  phoneNumber,
  actualAmount,status) {
  try {
    const uid = environment.uid;
    const charge = "500";
    await firebase
      .firestore()
      .collection("transactions")
      .doc(transactionRef)
      .set({
        transactionRef,
        amount,
        transactionInitiationDate,
        transactionType,
        uid,
        charge,
        phoneNumber,
        actualAmount,
        status
      });
  } catch (e) {
    console.log("FIREBASE FAILURE: SAVE TRANSACTION");
    console.log(e);
  }
}

async function updateStatus(transactionRef, MMTransactionId){
  try{
    await firebase.firestore().collection('transactions').doc(transactionRef)
    .update({status: "CONFIRMED", transactionRef:MMTransactionId});
  }catch(e){
    console.log("FIREBASE FAILURE: UPDATE STATUS ON TRANSACTION HISTORY");
    console.log(e);
  }
}



// async function test(item){
//   try{
//     await firebase.firestore().collection('zega').add(item);
//   }catch(e){
//     console.log("ZEGAY FAILED");
//     console.log(e);
//   }
// }

async function fundsCollected(
  transactionRef,
  amount,
  transactionInitiationDate,
  transactionType,
  phoneNumber,
  actualAmount
) {
  try {
    const uid = environment.uid;
    const charge = "500";
    await firebase
      .firestore()
      .collection("fundsCollected")
      .doc(transactionRef)
      .set({
        transactionRef,
        amount,
        transactionInitiationDate,
        transactionType,
        uid,
        charge,
        phoneNumber,
        actualAmount,
      });
  } catch (e) {
    console.log("FIREBASE FAILURE: SAVE TRANSACTION");
    console.log(e);
  }
}

async function storeBulkTransaction(bulkPayload) {
  try {
    let batch = firebase.firestore().batch();

    bulkPayload.forEach((dataload) => {
      const docId = dataload['EmailAddress'][0].substring(1,11);
      var transactionsCollection = firebase
        .firestore()
        .collection("transactions")
        .doc(docId);
        batch.set(transactionsCollection, {
          transactionRef: docId, 
          amount: dataload['Amount'][0], 
          transactionInitiationDate: Date.now(), 
          transactionType: "Bulk Payment", phoneNumber:dataload['AccountNumber'][0], 
          amountWithCharges: (parseInt(dataload['Amount'][0]) + 500), 
          name:dataload['Name'][0], reason: 'Successfully paid UGX ' + dataload['Amount'][0], status:"CONFIRMED"});
    });
    batch.commit().then(function () {
      console.log("SUCCEEDED BULK TRANSACTION DONE");
    });
  } catch (e) {
    console.log("FIREBASE FAILURE: BULK SAVE TRANSACTION");
    console.log(e);
  }
}

async function storeFailedBulkTransactions(bulkPayload) {
  try {
    let batch = firebase.firestore().batch();
    bulkPayload.forEach((dataload) => {
      const docId = dataload['EmailAddress'][0].substring(1,11);
      var transactionsCollection = firebase
        .firestore()
        .collection("transactions")
        .doc(docId);
      batch.set(transactionsCollection, {
      transactionRef: docId, 
      amount: dataload['Amount'][0], 
      transactionInitiationDate:Date.now(), 
      transactionType: "Bulk Payment", phoneNumber:dataload['AccountNumber'][0], 
      amountWithCharges: (parseInt(dataload['Amount'][0]) + 500), 
      name:dataload['Name'][0], reason: dataload['LowLevelErrorMessageNegative'][0], status:"FAILED"});
    });
    batch.commit().then(function () {
      console.log("FAILED TRANSACTION DONE");
    });
  } catch (e) {
    console.log("FIREBASE FAILURE: BULK SAVE TRANSACTION");
    console.log(e);
  }
}

async function deleteFailedBulkTransactions(bulkPayload, res) {
  try {
    let batch = firebase.firestore().batch();
    bulkPayload.forEach((uid) => {
      var transactionsCollection = firebase
        .firestore()
        .collection("transactions")
        .doc(uid['transactionRef']);
      batch.delete(transactionsCollection);
    });

    batch.commit().then(function () {
      console.log("DELETE BULK TRANSACTION DONE");
      res.status(200).send({message: "Successfully deleted selected bulk payments"});
      clearNotificationCounter();

    });
  } catch (e) {
    console.log("FIREBASE FAILURE: BULK DELETION FAILED");
    console.log(e);
    res.status(500).send({message: "Something went wrong while deleting"});
  }
}





async function storePayload(payload){
  try{
    const data = JSON.stringify(payload);
    await firebase.firestore().collection('ussd_logs').add({payload: data});
  }catch(e){
    console.log('STORE PAYLOAD FAILD');
    console.log(e);
  }
}

async function notifyOyaMicrocredit(payload){
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const data = payload;
  const config = {
    method: 'post',
    url: 'https://api.test.provisocloud.com:200/provisio/api/v1000/_transactions/_momopost/mp-500/repayments',
    headers: { 
      'CLIENT_ACCESS_APIKEY': environment['CLIENT_ACCESS_APIKEY'], 
      'API_CLIENT': environment['API_CLIENT'], 
      'Content-Type': 'application/json'
    },
    data : data
  };
  
  axios(config)
  .then(function (response) {
      if(response.status >= 200 || response.status < 300){
          console.log('notified oya microcredit');
          console.log(response.data);
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";
          return;
         }
      
  })
  .catch(function (error) {
    if (error.response) {
      console.log(error.response.data);
    } else if (error.request) {
      console.log(error.request);
    } else {
      console.log(error.message);
    }
  });

}

module.exports = {storePayload, storeBulkTransaction, 
  fundsCollected, saveTransaction, checkBulkStatus, notifyOyaMicrocredit, status, deleteFailedBulkTransactions};

/**
 * app.get('/wipe', async (req,res) => {
try{
    let batch = firebase.firestore().batch();
          let store = [];
          let lastSorted = [];
          firebase.firestore().collection('loancollection_logs').get().then((docs) => {
            docs.forEach(doc => {
              store.push({external_ref:doc.data()['external_ref'], docId: doc.id})
            });
            store.sort((a, b) => {
                if(b['external_ref'] === a['external_ref']){
                 lastSorted.push(b);         
                }
              });
              console.log(lastSorted);
              lastSorted.forEach((uid) => {
               
               var transactionsCollection = firebase
                 .firestore()
                 .collection("transactions")
                 .doc(uid['docId']);
               batch.delete(transactionsCollection);
             });
         
             batch.commit().then(function () {
               console.log("DELETE BULK TRANSACTION DONE");
               res.status(200).send({message: "Successfully deleted selected bulk payments"});
               
         
             });
          
           })
           
           
}catch(e){
    console.log(e)
    res.status(500).send({message: e});
}
})

 */
