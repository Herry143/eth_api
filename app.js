const express = require('express');
const app = express();
const bodyParser = require('body-parser');

//https
const fs = require("fs")
const https = require("https")
// const httpsServer = https.createServer({
//     key: fs.readFileSync("/root/certs/SERVER.key","utf8"),
//     cert: fs.readFileSync("/root/certs/SERVER.crt","utf8"),
//     ca: fs.readFileSync("/root/certs/ROOT.crt","utf8")
// }, app)

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const accountCtrller = require("./controller/account");
const txCtrller = require("./controller/transaction");
const blockCtrller = require("./controller/block");
const cpsCtrller = require("./controller/cps");
const apiCtrller = require("./controller/api");
const web3 = require("./lib/web3");
    
//api function
app.get("/ethereum1/account/:address/history", apiCtrller.getHistory);
app.get("/ethereum1/account/:address/history.detail", apiCtrller.getHistoryDetail);
app.get('/ethereum1/trasaction/sendsigned/:raw', apiCtrller.sendraw);
app.get('/ethereum1/account/:address/balance/:lastnumber?', apiCtrller.getBalance);

//about account
app.get('/ethereum/account', accountCtrller.create);
app.post('/ethereum/account/import', accountCtrller.recover);
app.post('/ethereum/account/dump', accountCtrller.dump);
app.get('/ethereum/account/:address/balance/:lastnumber?', accountCtrller.getBalance);
app.get("/ethereum/account/:address/history", accountCtrller.getHistory);
app.get("/ethereum/account/:address/history.detail", accountCtrller.getHistoryDetail);
app.post("/ethereum/balances", accountCtrller.getBalances);
app.get("/ethereum/account/:address/check", accountCtrller.check);

//about transaction
app.post('/ethereum/transaction', txCtrller.send);
app.get('/ethereum/transaction/sendsigned/:raw', txCtrller.sendraw);
app.get('/ethereum/transaction/:hash/info', txCtrller.getInfo);
app.get('/ethereum/transaction/:hash/confirmation', txCtrller.confirmation);
app.get('/ethereum/transaction/fee', txCtrller.getfee);
app.post('/ethereum/contract', txCtrller.deploy);
app.post('/ethtest/transaction', txCtrller.sendTest);
app.post('/ethereum/transaction/admin', txCtrller.sendAdmin);
app.get('/ethereum/transaction/gasprice', txCtrller.getGasPrice);

//about block
app.get('/ethereum/block/:block/:address?', blockCtrller.getTxs);


/**********************************************/
//               CPS                          //
/**********************************************/
app.get('/cps/account/:address/balance', cpsCtrller.getBalance);
app.post('/cps/transaction', cpsCtrller.send);
app.get('/cps/transaction/fee', cpsCtrller.getfee);



// utils
app.get("/ping", (req, res) => {
    res.send("");
})
app.get("/info", (req, res) => {
    web3.eth.isSyncing((err, sync) => {
        if (err) {
            res.status(400).json({"error": err.toString()});
            return;
        }
        if (!sync) {
            web3.eth.getBlockNumber((err, bn) => {
                if (err) {
                    res.status(400).json({"error": err.toString()});
                    return;
                }
                res.json(bn);
            })
        } else {
            res.json(sync);
        }
    })
})
app.get("/block", (req, res) => {
    web3.eth.getBlockNumber((err, bn) => {
        if (err) {
            return res.status(500).json({error: err.toString()});
        }
        res.json({"blockHeight": bn});
    })
})


app.listen(8080);
//httpsServer.listen(443);


module.exports = app;
