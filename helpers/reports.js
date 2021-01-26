const firebase = require('firebase-admin');
const moment = require('moment');
const PdfPrinter = require('pdfmake');
const { v4: uuidv4 } = require('uuid');
const { Parser } = require('json2csv');
const expirydate = {action: 'read', expires: '03-09-2500'};

async function monthlyReport(startDate, endDate, typeofReport, collectionType){
  const startOfMonth = parseInt(moment().clone().startOf('month').format('x'));
  const endOfMonth   = parseInt(moment().clone().endOf('month').format('x'));
  const time = collectionType == 'loancollection_logs' ? 'date_time': 'transactionInitiationDate';
  
  switch(typeofReport){
    case 'monthly':
      return await firebase.firestore()
      .collection(collectionType)
      .where(time,'>=', startOfMonth)
      .where(time,'<', endOfMonth)
      .orderBy(time,'desc').get();
    case 'range':
      return await firebase.firestore()
      .collection(collectionType)
      .where(time,'>=', moment(startDate).format('x'))
      .where(time,'<', moment(endDate).format('x'))
      .orderBy(time,'desc').get();
    default:
      return await firebase.firestore()
      .collection(collectionType)
      .orderBy(time,'desc').get();

  }
}



async function collectionlogs(payload){
  await firebase.firestore().collection('loancollection_logs')
  .doc(payload['external_ref']).set(payload, {merge: true});
}

async function printPdf(fonts, docDefinition, res, fullReuslts){
  const printer = new PdfPrinter(fonts);
	let pdfDoc = printer.createPdfKitDocument(docDefinition);
	
  const bucket = firebase.storage().bucket('tax-as-a-service.appspot.com');
	const gcsname = `${uuidv4()}.pdf`;
	const file = bucket.file(gcsname);
	const stream = file.createWriteStream({
		metadata: {
			contentType: 'application/pdf'
		}
	});
  pdfDoc.pipe(stream);
	stream.on('error', (err) => {
		console.log(err);
	});
	stream.on('finish', () => {
		file.getSignedUrl(expirydate).then(url => {
     const pdfUrl = url[0];
      printCsv(fullReuslts, pdfUrl, res);
		});
	});
	pdfDoc.end();
}

async function printCsv(fullReuslts, pdfUrl, res){
  const json2csvParser = new Parser();
  const csv = json2csvParser.parse(fullReuslts);
  const bucket = firebase.storage().bucket('tax-as-a-service.appspot.com');
	const gcsname = `${uuidv4()}.csv`;
  const file = bucket.file(gcsname);
  file.save(csv, function(err){
    if(err) throw err;
    file.getSignedUrl(expirydate).then(url => {
      res.status(200).json({pdfUrl: pdfUrl, csvUrl: url[0]});
  });
  });
  

}


module.exports = {monthlyReport, collectionlogs, printPdf, printCsv};