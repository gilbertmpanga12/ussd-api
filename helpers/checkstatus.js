require('dotenv').config();
const environment = process.env;
const firebase = require("firebase-admin");
const { v4: uuidv4 } = require('uuid');
const {
  incrementsingleBulkTransactionCounter,
  fundsCollectedCounter,reduceAmountCollected
} = require("./counters");
const axios = require('axios').default;
const {getBulkTransactionStatus, checkSingleBalanceStatus} = require('./balances');
const parseString = require('xml2js').parseString;


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


function checkBulkStatus(transactionRef , amount) {
  
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
    if (status == "OK") {
        incrementsingleBulkTransactionCounter(amount);
        reduceAmountCollected(amount);
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
      var transactionsCollection = firebase
        .firestore()
        .collection("transactions")
        .doc(uuidv4());
      batch.set(transactionsCollection, dataload);
    });
    batch.commit().then(function () {
      console.log("TRANSACTION DONE");
    });
  } catch (e) {
    console.log("FIREBASE FAILURE: BULK SAVE TRANSACTION");
    console.log(e);
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
fundsCollected, saveTransaction, checkBulkStatus, notifyOyaMicrocredit, status};
