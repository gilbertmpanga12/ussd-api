const {Router} = require('express');
const router = Router();
const {monthlyReport, printPdf} = require('../helpers/reports');
const moment = require('moment');
const {getFirebaseUser} = require('../helpers/firebaseSecurity');

var fonts = {
	Roboto: {
		normal: 'controllers/fonts/ProximaSoft-Regular.ttf',
        bold: 'controllers/fonts/ProximaSoft-Regular.ttf',
        italics: 'controllers/fonts/ProximaSoft-Regular.ttf',
        bolditalics: 'controllers/fonts/ProximaSoft-Regular.ttf'
	}
 };

 var docDefinition = {
	content: [
		{text: 'T', style: 'subheader'},
		{
			layout: 'lightHorizontalLines',
			table: {
			 headerRows: 1,
			  widths: [ '*', 'auto', 100, '*', '*'],
	  
			  body: [
				[ 'Amount', 'Rerefence id', 'Telephone', 'Loan repayment', 'MM transaction id']
			  ]
			}
		  }
	],
	styles: {
		header: {
			fontSize: 18,
			bold: true,
			margin: [0, 0, 0, 10]
		},
		subheader: {
			fontSize: 16,
			bold: true,
			margin: [0, 10, 0, 5]
		},
		tableExample: {
			margin: [0, 5, 0, 15]
		},
		tableHeader: {
			bold: true,
			fontSize: 13,
			color: 'black'
		}
	},
	defaultStyle: {
		// alignment: 'justify'
    }};

router.use(getFirebaseUser);

router.post('/api/monthly-report', async (req,res) => {
    try{
	const startDate = req.body['startDate'] ? req.body['startDate']: null;
	const endDate = req.body['endDate'] ? req.body['endDate']: null;
	const typeofReport = req.body['typeofReport'];
	const collectionType = req.body['collectionType'];
	const titleOperation = collectionType === 'loancollection_logs' ? 'Loan Collections': 'Loan Disbursements';
	const report = await monthlyReport(startDate, endDate, typeofReport, collectionType); //docDefinition.content[0].text
	const fullReuslts = [];
	switch(typeofReport){
		case 'monthly':
			docDefinition.content[0].text = titleOperation + ' Transactions for ' + moment().format('MMMM');
			break;
		case 'range':
			docDefinition.content[0].text = titleOperation +  ' Transactions between ' + moment(startDate).format('dddd, MMMM Do YYYY') + ' & ' + moment(endDate).format('dddd, MMMM Do YYYY');
			break;
		default:
			docDefinition.content[0].text = 'All ' + titleOperation +  'transaction history';
			break;
	}

	if(collectionType === 'loancollection_logs'){
		report.forEach(report => {
			fullReuslts.push({'Amount': `UGX${report.data()['amount']}`, 'Rerefence id':report.data()['customerReferenceId'], 'Telephone':report.data()['msisdn'], 'Loan repayment':moment(report.data()['date_time']).format("dddd, MMMM Do YYYY, h:mm:ss a"), 'MM transaction id':report.data()['network_ref']});
			docDefinition.content[1].table.body.push([`UGX${report.data()['amount']}`,report.data()['customerReferenceId'],
			report.data()['msisdn'], moment(report.data()['date_time']).format("dddd, MMMM Do YYYY, h:mm:ss a"), 
			report.data()['network_ref']]);
		});

	}else{
		docDefinition.content[1].table.body[0] = ['Amount', 'Rerefence id', 'Telephone', 'Loan repayment', 'Status'];
		report.forEach(report => {
			fullReuslts.push({'Amount':`UGX${report.data()['amount']}`, 'Rerefence id': report.data()['transactionRef'], 'Telephone':report.data()['phoneNumber'], 'Loan repayment':moment(report.data()['transactionInitiationDate']).format("dddd, MMMM Do YYYY, h:mm:ss a"), 'Transaction type':report.data()['transactionType']});
			docDefinition.content[1].table.body.push([`UGX${report.data()['transactionRef']}`,report.data()['amount'],
			report.data()['phoneNumber'], moment(report.data()['transactionInitiationDate']).format("dddd, MMMM Do YYYY, h:mm:ss a"), 
			report.data()['transactionType']]);
		});
	}
  
	printPdf(fonts, docDefinition, res, fullReuslts);
    
    }catch(e){
        console.log('FAILED TO RETURN MONTHLY TRANSACTIONS');
        console.log(e);
        res.status(500).json({message: `Something went wrong ${e}`});
    }
    
    
});



module.exports = router;