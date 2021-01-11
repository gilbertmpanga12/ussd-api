const firebase = require('firebase-admin');
const moment = require('moment');

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
  .add(payload);
}


module.exports = {monthlyReport, collectionlogs};