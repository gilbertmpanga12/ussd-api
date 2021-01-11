require('dotenv').config();
const {environment} = process.env;

function guardTransaction(req, res, next){
    const headers = req.headers['access_token'];
    if(headers != environment.ACCESS_TOKEN_SECRET){
        res.status(401).json({message: 'Access denied, access token is required'});
        return;
    }
    next();
}

exports.guardTransaction = guardTransaction;