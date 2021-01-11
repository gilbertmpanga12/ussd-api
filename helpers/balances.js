require('dotenv').config();
const { Router } = require("express");
const environment = process.env;
var xml2js = require("xml2js");
const router = Router();
const {getFirebaseUser} = require('./firebaseSecurity');
const axios = require('axios').default;


const headers = {
  "Content-type": "text/xml",
  "Content-transfer-encoding": "text",
};

router.use(getFirebaseUser);

// builder object
let builder = new xml2js.Builder();

async function checkSingleBalanceStatus(transactionRef){
  let payload = {
    AutoCreate: {
      Request: {
        APIUsername: environment.username,
        APIPassword: environment.password,
        Method: "actransactioncheckstatus",
        TransactionReference: transactionRef,
      },
    },
  };
  let xml = builder.buildObject(payload);
   return axios.post(environment.baseUrl, xml, {headers: headers});
}





async function getBulkTransactionStatus(transactionRef){
  let payload = {
    AutoCreate: {
      Request: {
        APIUsername: environment.username,
        APIPassword: environment.password,
        Method: "accheckbulkpaymentstatus",
        BulkPaymentRequestIdentifier: transactionRef,
      },
    },
  };
  let xml = builder.buildObject(payload);
  return axios.post(environment.baseUrl, xml, {headers: headers});

}

module.exports = {getBulkTransactionStatus, checkSingleBalanceStatus};

// router.get("/check-status/:transactionRef", function (req, res) {
//   let payload = {
//     AutoCreate: {
//       Request: {
//         APIUsername: environment.username,
//         APIPassword: environment.password,
//         Method: "actransactioncheckstatus",
//         TransactionReference: req.params["transactionRef"],
//       },
//     },
//   };
//   let xml = builder.buildObject(payload);
//   request.post(
//     {
//       url: environment.baseUrl,
//       port: environment.port,
//       method: "POST",
//       headers: {
//         "Content-type": "text/xml",
//         "Content-transfer-encoding": "text",
//       },
//       body: xml,
//     },
//     function (error, response, body) {
//       parseString(body, function (err, result) {
//         res.send(result);
//       });
//     }
//   );
// });



// router.get("/check-bulk-status/:transactionRef", function (req, res) {
//   let payload = {
//     AutoCreate: {
//       Request: {
//         APIUsername: environment.username,
//         APIPassword: environment.password,
//         Method: "accheckbulkpaymentstatus",
//         BulkPaymentRequestIdentifier: req.params["transactionRef"],
//       },
//     },
//   };
//   let xml = builder.buildObject(payload);
//   request.post(
//     {
//       url: environment.baseUrl,
//       port: environment.port,
//       method: "POST",
//       headers: {
//         "Content-type": "text/xml",
//         "Content-transfer-encoding": "text",
//       },
//       body: xml,
//     },
//     function (error, response, body) {
//       parseString(body, function (err, result) {
//         res.send(result);
//       });
//     }
//   );
// });




// router.get("/get-balance", function (req, res) {
//   let payload = {
//     AutoCreate: {
//       Request: {
//         APIUsername: environment.username,
//         APIPassword: environment.password,
//         Method: "acacctbalance",
//       },
//     },
//   };
//   let xml = builder.buildObject(payload);
//   request.post(
//     {
//       url: environment.baseUrl,
//       port: environment.port,
//       method: "POST",
//       headers: {
//         "Content-type": "text/xml",
//         "Content-transfer-encoding": "text",
//       },
//       body: xml,
//     },
//     function (error, response, body) {
//       parseString(body, function (err, result) {
//         let balances =
//           result["AutoCreate"]["Response"][0]["Balance"][0]["Currency"];
//         console.log(balances);
//         let counter = 0;
//         balances.forEach((transaction) => {
//           counter += parseInt(transaction["Balance"][0]);
//         });
//         res.send({ totalBalance: counter });
//       });
//     }
//   );
// });

