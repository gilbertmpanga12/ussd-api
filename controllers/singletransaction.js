require('dotenv').config();
const {Router} = require('express');
const environment = process.env;
const router = Router();
const axios = require('axios').default;
const https = require('https');
const {getFirebaseUser} = require('../helpers/firebaseSecurity');
const {collectionlogs} = require('../helpers/reports');
const {checkForBalance, loadFloatBalance, fundsCollectedCounter} = require('../helpers/counters');
const {setBalance} = require('../helpers/checkBalance');
const {checkNetworkOperator} = require('../helpers/networkChecker');
const {notifyOyaMicrocredit} = require('../helpers/checkstatus');
const headers = {CLIENT_ACCESS_APIKEY: environment.CLIENT_ACCESS_APIKEY, API_CLIENT: environment.API_CLIENT};
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
// const {guardTransaction} = require('../helpers/ussdSecurity');

// const balanceChecker = function(req, res, next){
//     try{
//         checkForBalance().then((balance) => {
//             if(balance.data().fundsAvailableCount < 0){
//                 res.status(500).send({message: "Insufficient balance to complete transaction. Please load more and try again"});
//             }else{
//                 next();
//             }
//         });
//     }catch(e){
//         console.log('FIREBASE BALANCE INSUFFICIENT');
//         console.log(e);
//         res.status(500).send({message: "Oops an error occured while processing your request, try again"});
//     }
    
// };


// validate customer reference ID
router.get('/api/validate-customer/:customerReferenceId', async function(req,res){ // guardTransaction
    try{
        const customerReferenceId = req.params['customerReferenceId'];
        const url = `https://api.test.provisocloud.com:100/loanbalance/inquiry/${customerReferenceId}/_v1200`;
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        const availableBalance = await axios.get(url,{headers:headers, httpsAgent: new https.Agent({
            rejectUnauthorized: false
        })});
       if(availableBalance.status >= 200 || availableBalance.status < 300){
        const availableBalanceResponse = availableBalance.data;
        availableBalanceResponse['ISSUED_AT'] = Date.now();
       // const balance = availableBalanceResponse['Balance'];
        res.status(200).json({...availableBalanceResponse});
        setBalance(customerReferenceId, availableBalanceResponse);
        return;
       };
       res.status(400).json({message: "Please enter a valid customer reference ID"});
    }catch(e){
        handleError(e, res);
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";
    }
 });

 // enter amount 
 router.post('/api/enter-amount', async (req,res) => { // guardTransaction,
     try{
    
    console.log('enter amount called');
    const payload = req.body;
    const requestedLoan = payload['amount'];
    const customerReferenceId = payload['narrative'];
    // const TXNID = payload['external_ref'];
    const TXNID = uuidv4();
    const phoneNumber = payload['msisdn'];
    const companyName = checkNetworkOperator(phoneNumber);
    const oyaPayload = {
        "TYPE": "SYNC_BILLPAY_REQUEST",
        "TXNID": TXNID,
        "MSISDN": phoneNumber,
        "AMOUNT": requestedLoan,
        "COMPANYNAME": companyName,
        "CUSTOMERREFERENCEID": customerReferenceId
      };
    console.log('IPN CALLED');
    collectionlogs({amount: payload['amount'], 
    date_time: parseInt(moment(payload['date_time']).format('x')), 
    external_ref: payload['external_ref'], 
    msisdn: payload['msisdn'], 
    customerReferenceId: payload['narrative'], 
    network_ref: payload['network_ref'], 
    signature: payload['signature'], generated_id: TXNID});
    fundsCollectedCounter(requestedLoan);
    notifyOyaMicrocredit(oyaPayload);
    
     }catch(e){
        console.log(e);
        handleError(e, res);
     }



 });


 function handleError(error, res){
    if (error.response) {
        console.log(error.response.data);
        res.status(error.response.status).send(error.response.data);
      } else if (error.request) {
        console.log(error.request)
        res.status(500).send(error.request);
      } else {
        console.log(error.message);
        res.status(500).send(error.message);
      }
 }


// load new float
router.get('/api/load-float/:amount', getFirebaseUser, async(req, res) => {
    try{
        const amount = req.params['amount'];
        console.log(amount)
        const checkAmount = await checkForBalance();
        if(checkAmount.data()){
            await loadFloatBalance(amount);
            res.status(200).json({message: `Deposited ${amount} successfully`});
        }
    }catch(e){
        console.log(e);
        res.status(500).json({message: `An error occured ${e}`});
    }
});


module.exports = router;

// router.post('/api/manual-loans', getFirebaseUser, function(req,res){
//     try{
//         const amount = req.body['amount'];
//         const phoneNumber = req.body['phoneNumber'];
//         const actualAmount = req.body['actualAmount'];
//         const referenceId = req.body['referenceId'];
        
//         let payload = {
//             AutoCreate: {
//                 Request: {
//                     APIUsername: environment.username,
//                     APIPassword: environment.password,
//                     Method: "acdepositfunds",
//                     NonBlocking: "TRUE",
//                     Amount: amount,
//                     Account: phoneNumber,
//                     Narrative: "FundsPayment"
//                 }
//             }
//         };
        
//         let xml = builder.buildObject(payload);
//          request.post({
//              url: environment.baseUrl,
//             port: environment.port,
//             method:"POST",
//             headers: {
//                "Content-type": "text/xml", "Content-transfer-encoding": "text"
//             },
//              body: xml
//         },
//         function(error, response, body){
//             parseString(body, function (err, result) {
//             const result_load = result["AutoCreate"]["Response"][0];
//             const statusCode = result_load["Status"][0];
//             if(statusCode === "ERROR"){
//                 res.status(500).send({message: result_load["StatusMessage"][0]});
//                 return;
//             }
//             // const transactionRef = result_load["MNOTransactionReferenceId"][0];
//             // const transactionInitiationDate =  Date.now();
//             //const transactionRefMM = result_load["MNOTransactionReferenceId"][0];
//             const transactionInitiationDate =  Date.now();
//             const transactionRef = result_load["TransactionReference"][0];
//             const shortenTransactionRef = transactionRef.substring(0,10);
          
//             saveTransaction(shortenTransactionRef, amount, transactionInitiationDate, 
//             "Manual Recovery", phoneNumber, actualAmount);
    
//             incrementTransactionCounter(transactionRef);
    
//             notifyOyaMicrocredit({AMOUNT: amount, CUSTOMERREFERENCEID: referenceId, MSISDN: phoneNumber, TXNID: `${Date.now()}`});
          
//             res.send(result);
//             setTimeout(() => {
//                     status(transactionRef,
//                         amount,
//                         transactionInitiationDate,
//                         "Manual Recovery",
//                         phoneNumber,
//                         actualAmount, shortenTransactionRef);
//                 }, 20000);
//             });
//             });
//     }catch(e){
//         res.status(500).send({message: "An internal error occured"});
//     }

       
        
// });
