require('dotenv').config();
const {Router} = require('express');
const request = require("request");
const environment = process.env;
var xml2js = require('xml2js');
const router = Router();
const { v4: uuidv4 } = require('uuid');
// builder object
let builder = new xml2js.Builder();
const parseString = require('xml2js').parseString;
const {status, storeBulkTransaction, checkBulkStatus, saveTransaction} = require('../helpers/checkstatus');
const {incrementTransactionCounter, checkForBalance} = require('../helpers/counters');
const {getFirebaseUser} = require('../helpers/firebaseSecurity');
const {deleteFailedBulkTransactions} = require('../helpers/checkstatus');

router.use(getFirebaseUser);

router.use(function(req, res, next){
    try{
        checkForBalance().then((balance) => {
            if(balance.data().fundsAvailableCount < 0){
                res.status(500).send({message: "Insufficient balance to complete transaction. Please load more and try again"});
            }else{
                next();
            }
        });
    }catch(e){
        console.log('FIREBASE BALANCE INSUFFICIENT');
        console.log(e);
        res.status(500).send({message: "Oops an error occured while processing your request, try again"});
    }
    
});



// bulk payment
router.post('/pay-bulk-payment', 
function(req,res){
    const json = req.body;
    const beneficiaries = json['xml'];
    // const phoneNumbers = json['phoneNumbers'];
    const bulkReason = json['reason'];
    const from = json['from'];
    let xml = '<?xml version="1.0" encoding="UTF-8" ?>';
    xml += "<AutoCreate>";
    xml += "<Request>";
    xml += "<APIUsername>" + environment.oyausername + "</APIUsername>";
    xml += "<APIPassword>" + environment.password + "</APIPassword>";
    xml += "<Method>accreatebulkpayment</Method>";
    xml += "<Name>" + from + "</Name>";
    xml += "<Description>" + bulkReason + "</Description>";
    // xml += "<SchedulePayment>" + req.params['schedulePayment'] + "</SchedulePayment>";
    xml += "<GroupwidePaymentNotificationText >" + "You have received a money from Oya MicroCredit" + "</GroupwidePaymentNotificationText >";
    xml += "<PrivateBulkPaymentRequestId>" + uuidv4() + "</PrivateBulkPaymentRequestId>";
    xml += "<Beneficiaries>";
    /*Beneficiaries go here*/
    xml += beneficiaries;
    xml += "</Beneficiaries>";
    xml += "</Request>";
    xml += "</AutoCreate>";
   request.post({
        url: environment.baseUrl,
        port: environment.port,
        method:"POST",
        headers: {
           "Content-type": "text/xml", "Content-transfer-encoding": "text"
        },
         body: xml
    },
    function(error, response, body){
        parseString(body, function (err, result) {
            const result_load = result["AutoCreate"]["Response"][0];
            console.log('result load block');
            console.log(result_load);
            const statusCode = result_load["Status"][0];
            if(statusCode === "ERROR"){
                res.status(500).send({message: result_load["StatusMessage"][0]});
                return;
            }
            const transactionRef = result_load["BulkPaymentRequestIdentifier"][0];
            // const transactionInitiationDate =  Date.now();
            // var bulkTransactionTotal = 0;
            // let formatedPhoneNumbers = phoneNumbers.map(phoneNumber => {
            //     bulkTransactionTotal += (parseInt(phoneNumber['Amount']) + 500);
            //     return {transactionRef: transactionRef, amount: phoneNumber['Amount'], 
            //         transactionInitiationDate:transactionInitiationDate, 
            //         transactionType: "Bulk Payment", phoneNumber:phoneNumber['MSISND'], amountWithCharges: (parseInt(phoneNumber['Amount']) + 500), 
            //         name:phoneNumber['Name'], reason: phoneNumber['Reason'], status:"COMFIRMED"};
            // });
            // storeBulkTransaction(formatedPhoneNumbers);
            // incrementTransactionCounter(transactionRef);

            res.status(200).send(result);
            setTimeout(() => checkBulkStatus(transactionRef), 20000);
            });
    });

});




// gets money from Yo! account to mobile money account
router.get('/withdraw/:amount/:phoneNumber/:narrative/:actualAmount', function(req,res){
    const amount = req.params['amount'];
    const phoneNumber = req.params['phoneNumber'];
    const narrative = req.params['narrative'];
    const actualAmount = req.params['actualAmount'];
    
    let payload = {
        AutoCreate: {
            Request: {
                APIUsername: environment.oyausername,
                APIPassword: environment.password,
                Method: "acwithdrawfunds",
                NonBlocking: "TRUE",
                Amount: amount,
                Account: phoneNumber,
                Narrative: narrative
            }
        }
    };
    let xml = builder.buildObject(payload);
    request.post({
        url: environment.baseUrl,
        port: environment.port,
        method:"POST",
        headers: {
           "Content-type": "text/xml", "Content-transfer-encoding": "text"
        },
         body: xml
    },
    function(error, response, body){
        parseString(body, function (err, result) {
            const result_load = result["AutoCreate"]["Response"][0];
            const statusCode = result_load["Status"][0];
            console.log(JSON.stringify(result));
            if(statusCode === "ERROR"){
                res.status(500).send({message: result_load["StatusMessage"][0]});
                return;
            }
            const transactionInitiationDate =  Date.now();
            const transactionRef = result_load["TransactionReference"][0];
            const shortenTransactionRef = transactionRef.substring(0,10);
            
            incrementTransactionCounter(transactionRef);

            saveTransaction(shortenTransactionRef,
                amount,
                transactionInitiationDate,
                "Single Payment",
                phoneNumber,
                actualAmount, "PENDING");
    
            res.status(200).send(result);
            setTimeout(() => {
                    status(transactionRef,
                        amount,
                        transactionInitiationDate,
                        "Single Payment",
                        phoneNumber,
                        actualAmount,shortenTransactionRef);
                }, 20000);
            });
    });

});

// transfer funds from Yo! to Yo!
router.get('/ac_internal_transfer/:currencyCode/:eneficiaryAccount/:email/:amount/:narrative', function(req,res){
    let payload = {
        AutoCreate: {
            Request: {
                APIUsername: environment.oyausername,
                APIPassword: environment.password,
                Method: "acinternaltransfer",
                CurrencyCode: req.params['currencyCode'],
                BeneficiaryAccount: req.params['beneficiaryAccount'],
                BeneficiaryEmail: req.params['email'],
                Amount: req.params['amount'],
                Narrative: req.params['narrative']
            }
        }
    };
    let xml = builder.buildObject(payload);
    request.post({
        url: environment.baseUrl,
        port: environment.port,
        method:"POST",
        headers: {
           "Content-type": "text/xml", "Content-transfer-encoding": "text"
        },
         body: xml
    },
    function(error, response, body){
        parseString(body, function (err, result) {
            res.send(result);
        });
    });

});

router.post('/delete-selected-bulk-payments', (req,res) => {
    const selectedItems = req.body['selectedItems'];
    deleteFailedBulkTransactions(selectedItems, res);
});

module.exports = router;
