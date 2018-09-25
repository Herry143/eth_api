
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const apiCtrller = require("./controller/api");
//api function
app.get('/ethereum/account/:address/balance/:lastnumber?', apiCtrller.getBalance);
app.get("/ethereum/account/:address/history", apiCtrller.getHistory);
app.get("/ethereum/account/:txhash/history.detail", apiCtrller.getHistoryDetail);
app.get('/ethereum/transaction/sendsigned/:raw', apiCtrller.sendraw);
app.get('/test', apiCtrller.test);

app.listen(8080);

module.exports = app;