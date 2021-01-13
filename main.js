require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const environment = process.env;
const xmlParser  = require('express-xml-bodyparser');
const singleTransaction = require('./controllers/singletransaction');
const bulkTransaction = require('./controllers/bulktransaction');
const reports = require('./controllers/reports');
const admin = require('firebase-admin');
const serviceAccount = require("./tax-as-a-service-firebase-adminsdk-a28um-96457548e1.json");
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const rateLimit = require("express-rate-limit");
const {getFirebaseUser} = require('./helpers/firebaseSecurity');


const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

var writeFile = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://tax-as-a-service.firebaseio.com"
});



const app = express();
app.set('trust proxy', 1);
app.use(limiter);
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(helmet());
app.use(xmlParser());
app.use(morgan('combined', {stream: writeFile}));

// routes
app.use('/single-transaction', singleTransaction);
app.use('/bulk-transactions',  bulkTransaction);
app.use('/reports', reports);
app.get('/refresh-token', getFirebaseUser, (req, res) => res.status(200).json({status: true, ...req.user}));
app.get('/', (req,res) =>  res.send({message: "server works"}));


app.listen(environment.port, () => {
    console.log('listening on🚀🚀🚀' + ' ' + environment.port);
});
