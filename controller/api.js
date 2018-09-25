//const web3 = require("../lib/web3");
var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"))
const utils = require("../lib/utils");
const request = require('request');
const cw = require("../lib/cw");
const BN = web3.utils.BN;

//返回结果参照第三方api
exports.getBalance = function (req, res) {
    var address = req.params.address;
    if (!utils.checkAddress(address)) {
        res.status(400).json({ "error": "address is invalid" });
        return;
    }
    var lastBlockNumber = req.params.lastnumber;
    if (lastBlockNumber === undefined) {
        lastBlockNumber = 'latest';
    }else if (!/^[0-9]+$/.test(lastBlockNumber)) {
        res.status(400).json({ "error": "lastBlockNumber was provided, but it is invalid" });
        return;
    }
    web3.eth.getBalance(address,lastBlockNumber, function (err, balance) {
        if (err) {
            res.status(400).json({ "error": err.toString() });
            return;
        }
        res.json({ "status":"1","message": "OK", "result": balance});
    });
}

exports.getHistory1 = function (req, res) {
    var address = req.params.address;
    if (!utils.checkAddress(address)) {
        res.status(400).json({ "error": "address is invalid" });
        return;
    }
    var page = req.query.page;
    var pagesize = req.query.pagesize;
    if (!page || page == "0") {
        page = 1;
    } else {
        if (!/^[1-9][0-9]*$/.test(page)) {
            res.status(400).json({ "error": "page invalid" });
            return;
        }
        page = parseInt(page);
    }
    if (!pagesize || pagesize == "0") {
        pagesize = 10;
    } else {
        if (!/^[1-9][0-9]*$/.test(pagesize)) {
            res.status(400).json({ "error": "pagesize invalid" });
            return;
        }
        pagesize = parseInt(pagesize);
    }
    request.get(`https://api.trustwalletapp.com/transactions?address=${address}&page=${page}&limit=${pagesize}`, (err, response, body) => {
        if (err) {
            res.status(400).json({ "error": "something is wrong when get history" });
            return;
        }
        ret = [];
        try {
            var scope = JSON.parse(body).docs;
            if (scope == undefined) {
                res.status(400).json({ "error": "something is wrong when get history" });
                return;
            }
            scope.forEach((item) => {
                ret.push(item.id);
            });
            return res.json({ "address": address, "transactions": ret });
        } catch (e) {
            return res.json({ "address": address, "transactions": [] });
        }
    });
}
exports.getHistory = function (req, res) {
    var address = req.params.address;
    if (!utils.checkAddress(address)) {
        res.status(400).json({ "error": "address is invalid" });
        return;
    }
    var page = req.query.page;
    var pagesize = req.query.pagesize;
    if (!page || page == "0") {
        page = 1;
    } else {
        if (!/^[1-9][0-9]*$/.test(page)) {
            res.status(400).json({ "error": "page invalid" });
            return;
        }
        page = parseInt(page);
    }
    if (!pagesize || pagesize == "0") {
        pagesize = 2;
    } else {
        if (!/^[1-9][0-9]*$/.test(pagesize)) {
            res.status(400).json({ "error": "pagesize invalid" });
            return;
        }
        pagesize = parseInt(pagesize);
    }
    var start=pagesize*(page-1);
    var end=page*pagesize;
    web3.eth.extend({
        methods: [{
            name: "getAddressTransactions",
            call: 'eth_getAddressTransactions',
            params: 3,
            inputFormatter: [web3.extend.formatters.inputAddressFormatter, null, null]
        }]
    });
    web3.eth.getAddressTransactions(address, start, end, (err, txs) => {//左闭右开
        console.log(txs);
        if (txs == undefined) {
            res.status(400).json({ "error": "something is wrong when get history" });
            return;
        }
        var ret = [];
        try {
            txs.forEach((item) => {
                var isIncome = item.from.toLowerCase() !== address.toLowerCase();
                var gasUsed=item.gasUsed;
                var gasPrice=item.gasPrice;
                var fee=gasUsed*(gasPrice);
                fee = web3.utils.fromWei(fee.toString(), 'ether')+" eth";
                var gasString="=Gas ("+item.gasUsed+") * GasPrice ("+web3.utils.fromWei(item.gasPrice.toString(),'gwei')+" gwei)";
                var date= item.timestamp.toString()+"000";
                //为JAVA对接，做位数处理，从JAVA得到的数据均乘以1e10,返回给JAVA的数据均除以1e10
                //kind:0-调用智能合约或者以太币转账,kind:1-创建合约地址
                ret.push({ "hash": item.hash, "value": web3.utils.fromWei(item.value.toString(),'ether'), "from": item.from, "to": item.to,"isIncome":isIncome,"txreceiptStatus":item.kind.toString(), "date": date,"fee":fee,"gasString":gasString,"isError": "0"});
                
            });
         res.json({ "result": ret});
        } catch (e) {
            console.log(e)
        }
    });
}
exports.getHistoryDetail1 = function (req, res) {
    var address = req.params.address;
    if (!utils.checkAddress(address)) {
        res.status(400).json({ "error": "address is invalid" });
        return;
    }
    var page = req.query.page;
    var pagesize = req.query.pagesize;
    if (!page || page == "0") {
        page = 1;
    } else {
        if (!/^[1-9][0-9]*$/.test(page)) {
            res.status(400).json({ "error": "page invalid" });
            return;
        }
        page = parseInt(page);
    }
    if (!pagesize || pagesize == "0") {
        pagesize = 10;
    } else {
        if (!/^[1-9][0-9]*$/.test(pagesize)) {
            res.status(400).json({ "error": "pagesize invalid" });
            return;
        }
        pagesize = parseInt(pagesize);
    }
    request.get(`https://api.trustwalletapp.com/transactions?address=${address}&page=${page}&limit=${pagesize}`, (err, response, body) => {
        if (err) {
            res.status(400).json({ "error": "something is wrong when get history" });
            return;
        }
        ret = [];
        try {
            var scope = JSON.parse(body).docs;
            if (scope == undefined) {
                res.status(400).json({ "error": "something is wrong when get history" });
                return;
            }
            scope.forEach((item) => {
                //为JAVA对接，做位数处理，从JAVA得到的数据均乘以1e10,返回给JAVA的数据均除以1e10
                ret.push({ "from": item.from, "to": item.to, "value": utils.javaPush(item.value), "hash": item.id, "timestamp": item.timeStamp });
            });
            return res.json({ "address": address, "transactions": ret });
        } catch (e) {
            return res.json({ "address": address, "transactions": [] });
        }
    });
}
exports.getHistoryDetail = function (req, res) {   
    var hash = req.params.txhash;
    web3.eth.getTransaction(hash, function (err, result) {
        if (err) {
            res.status(400).json({ "error": err.toString() });
            return;
        }
        console.log(result);
        res.json({ "jsonrpc": "2.0", "id":1,"result":result });
    });
}
exports.sendraw = function (req, res) {
    var rawTransaction = req.params.raw;
    console.log(rawTransaction)
    web3.eth.sendSignedTransaction(rawTransaction, function (err, hash) {
        if (err) {
            res.status(400).json({ "code":400,"error": err.toString() });
            return;
        }
        res.json({"code":200, "transactionHash": hash });
    });
}
exports.test = function (req, res) {
    res.json({ "jsonrpc": "2.0", "id":1,"result":"test" });
}