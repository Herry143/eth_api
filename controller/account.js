const web3 = require("../lib/web3");
const utils = require("../lib/utils");
const request = require('request');
const cw = require("../lib/cw");
const BN = web3.utils.BN;

exports.create = function (req, res) {
    // if (req.protocol !== "https") {
    //     return res.status(403).json({ error: "must use https" });
    // }
    var w = web3.eth.accounts.create();
    // let ansa = req.body.ansa;
    // let ansb = req.body.ansb;
    // let ansc = req.body.ansc;
    // let time = req.body.time;
    // if (!ansa || !ansb || !ansc || !time) {
    //     return res.status(400).json({error: "ansa, ansb, ansc, time required"});
    // }
    // let enc = cw.encode(ansa, ansb, ansc, time, w.privateKey);
    res.json({ "address": w.address, "enc":  w.privateKey });
}

exports.check = function (req, res) {
    let addr = req.params.address;
    return res.json({ "result": utils.checkAddress(addr) });
}

exports.recover = function (req, res) {
    if (req.protocol !== "https") {
        return res.status(403).json({ error: "must use https" });
    }
    let priv = req.body.priv;
    let ansa = req.body.ansa;
    let ansb = req.body.ansb;
    let ansc = req.body.ansc;
    let time = req.body.time;
    if (!utils.checkPrivateKey(priv)) {
        res.status(400).json({ "error": "privateKey invalid" });
        return;
    }
    if (!ansa || !ansb || !ansc || !time) {
        return res.status(400).json({error: "ansa, ansb, ansc, time required"});
    }
    var account = web3.eth.accounts.privateKeyToAccount(priv);
    let enc = cw.encode(ansa, ansb, ansc, time, priv);
    res.json({ "address": account.address, "enc": enc });
}

exports.dump = function(req, res) {
    if (req.protocol !== "https") {
        return res.status(403).json({ error: "must use https" });
    }
    let ansa = req.body.ansa;
    let ansb = req.body.ansb;
    let ansc = req.body.ansc;
    let time = req.body.time;
    let enc = req.body.enc;
    if (!ansa || !ansb || !ansc || !time || !enc) {
        return res.status(400).json({error: "ansa, ansb, ansc, time, enc required"});
    }
    let priv = cw.decode(ansa, ansb, ansc, time, enc);
    return res.json({"privateKey": priv});
}

exports.getBalance = function (req, res) {
    var address = req.params.address;
    if (!utils.checkAddress(address)) {
        res.status(400).json({ "error": "address is invalid" });
        return;
    }
    var lastBlockNumber = req.params.lastnumber;
    if (lastBlockNumber === undefined) {
        lastBlockNumber = 'latest';
    } else if (!/^[0-9]+$/.test(lastBlockNumber)) {
        res.status(400).json({ "error": "lastBlockNumber was provided, but it is invalid" });
        return;
    }
    web3.eth.getBalance(address, lastBlockNumber, function (err, balance) {
        if (err) {
            res.status(400).json({ "error": err.toString() });
            return;
        }

        res.json({ "address": address, "balance": new BN(balance).div(new BN("10000000000")).toString() });
    });
}

exports.getBalances = async function (req, res) {
    let addrs = req.body.addrs;
    if (!(addrs instanceof Array)) {
        return res.status(400).json({ error: "addrs should be a array" });
    }
    let ret = [];
    for (let addr of addrs) {
        if (!utils.checkAddress(addr)) {
            res.status(400).json({ "error": `addrs(${addr}) is invalid` });
            return;
        }
        let balance = await web3.eth.getBalance(addr).catch(err => { return "0" });
        ret.push({
            address: addr,
            balance: new BN(balance).div(new BN("10000000000")).toString()
        });
    }
    return res.json(ret);
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
        
        try {
            var ret = [];
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

exports.getHistoryDetail = function (req, res) {
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
