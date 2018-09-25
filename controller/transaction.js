const web3 = require("../lib/web3");
const utils = require("../lib/utils");
const db = require("../lib/db");
const logger = require("../lib/logger");
const cw = require("../lib/cw");
const BN = web3.utils.BN;


exports.send = async function (req, res) {
    if (req.protocol !== "https") {
        return res.status(403).json({ error: "must use https" });
    }
    //var priv = req.body.privateKey;
    var value = req.body.amount;
    var to = req.body.to;
    var gas = req.body.gas;
    var fee = req.body.fee;
    let uuid = req.body.uuid;
    if (uuid === undefined || typeof (uuid) != 'string') {
        res.status(400).json({ "error": "uuid invalid" });
        return;
    }
    if (/*!priv || */value == undefined || !to || !gas || !fee) {
        res.status(400).json({ "error": "missing params(''amount', 'to' 'gas' 'fee' is required)" })
        return;
    }
    if (typeof (value) != "string" || typeof (gas) != "string" || typeof (fee) != "string") {
        res.status(400).json({ "error": "'amount', 'gas', 'fee' must be string" });
        return;
    }
    // if (!utils.checkPrivateKey(priv)) {
    //     res.status(400).json({ "error": "privateKey invalid" });
    //     return;
    // }
    if (!utils.checkAddress(to)) {
        res.status(400).json({ "error": "'to' address is invalid" });
        return;
    }
    if (!utils.checkNumberAndNotZero(gas)) {
        res.status(400).json({ "error": "'gas' invalid" });
        return;
    }
    if (!utils.checkNumber(value)) {
        res.status(400).json({ "error": "'amount' invalid" });
        return;
    }
    if (!utils.checkNumberAndNotZero(fee)) {
        res.status(400).json({ "error": "'fee' invalide" });
        return;
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
    //如果uuid存在，则返回已经存在的transactionHash，并且立即返回，不执行交易
    let existingTx = await db.get(uuid).catch(err => {
        if (err.notFound) {
            return undefined;
        } else {
            return { srvErr: err };
        }
    });
    if (existingTx !== undefined) {
        if (existingTx.srvErr) {
            res.status(500).json({ error: "levelDB error: " + existingTx.srvErr.toString() });
            logger.error("get uuid error: %s", existingTx.srvErr);
            return;
        } else {
            res.json({ "transactionHash": existingTx });
            logger.warn("Repeat submitting a transaction\n\tuuid:%s\n\ttxhash:%s\n\tip:%s", uuid, existingTx, req.ip)
            return;
        }
    }
    var gasPrice = new BN(utils.javaGet(fee)).div(new BN(gas)).toString();
    value = utils.javaGet(value);
    var account = web3.eth.accounts.privateKeyToAccount(priv);
    account.signTransaction({
        "from": account.address,
        "to": to,
        "value": value,
        "gas": gas,
        "gasPrice": gasPrice,
        "chainId": 1, //for livenet
        //"chainId":1337  //for --dev 
    }, function (err, tx) {
        if (err) {
            res.status(400).json({ "error": err.toString() });
            return;
        }
        web3.eth.sendSignedTransaction(tx.rawTransaction, function (err, hash) {
            if (err) {
                res.status(400).json({ "error": err.toString() });
                return;
            }
            logger.warn("Send transaction(via %s): %s", req.ip, JSON.stringify({
                from: account.address,
                to: to,
                value: value,
                gas: gas,
                gasPrice: gasPrice,
                uuid: uuid,
                txhash: hash
            }, null, 4));
            res.json({ "transactionHash": hash });
            //执行交易成功，将uuid放入db
            db.put(uuid, hash, (err) => {
                if (err) {
                    logger.error("put uuid error: %s", err);
                }
            })
        })
    });
}

exports.sendraw = function (req, res) {
    var rawTransaction = req.params.raw;
    web3.eth.sendSignedTransaction(rawTransaction, function (err, hash) {
        if (err) {
            res.status(400).json({ "error": err.toString() });
            return;
        }
        res.json({ "transactionHash": hash });
    });
}

exports.getInfo = function (req, res) {
    var hash = req.params.hash;
    var receiptP = web3.eth.getTransactionReceipt(hash);
    var txP = web3.eth.getTransaction(hash);

    Promise.all([receiptP, txP]).then(scope => {
        if (!scope[0] || !scope[1]) {
            res.status(400).json({ "error": "transaction not found" });
            return;
        }
        var receipt = scope[0];
        if (!receipt.to) {
            receipt.to = receipt.contractAddress;
        }
        var status;
        if (receipt.status) {
            status = "success";
        } else {
            status = "fail";
        }
        var fee = new BN(receipt.gasUsed.toString()).mul(new BN(scope[1].gasPrice.toString())).toString();
        web3.eth.getBlock(receipt.blockNumber, (err, block) => {
            if (err) {
                res.status(400).json({ "error": err.toString() });
                return;
            }
            if (!block.timeStamp) {
                block.timeStamp = "";
            }
            res.json({
                blockHash: receipt.blockHash,
                blockNumber: receipt.blockNumber.toString(),
                from: receipt.from,
                to: receipt.to,
                //gasUsed: receipt.gasUsed.toString(),
                fee: utils.javaPush(fee),
                status: status,
                timestamp: block.timestamp.toString()
            });
        });
    }, err => {
        res.status(400).json({ "error": err.toString() });
    });
}

exports.confirmation = function (req, res) {
    var hash = req.params.hash;
    web3.eth.getTransaction(hash, function (err, transaction) {
        if (err) {
            res.status(400).json({ "error": err.toString() });
            return;
        }
        if (!transaction) {
            res.status(400).json({ "error": "transaction not found" });
            return;
        }
        web3.eth.getBlockNumber(function (err, result) {
            if (err) {
                res.status(400).json({ "error": err.toString() })
                return;
            }
            res.json({ "number": (result - transaction.blockNumber).toString() })
        });
    });
}

exports.getfee = function (req, res) {
    web3.eth.getGasPrice().then(price => {
        var fee = new BN(price).mul(new BN('21000')).div(new BN("10000000000")).add(new BN('1')).toString();
        res.json({ "fee": fee });
    }, err => {
        res.status(400).json({ "error": "something wrong when get fee" });
        console.log(err);
    })
}

exports.getGasPrice = async function(req, res) {
    let gasPrice = await web3.eth.getGasPrice().catch(err => {return undefined;});
    if (gasPrice === undefined) {
        return res.status(500).json({error: "get gasPrice from geth fail"});
    }
    gasPrice = gasPrice.toString();
    return res.json({gasPrice});
}

exports.sendTest = async function (req, res) {
    if (req.protocol !== "https") {
        return res.status(403).json({ error: "must use https" });
    }
    var value = req.body.amount;
    var to = req.body.to;
    var gas = req.body.gas;
    var fee = req.body.fee;
    let uuid = req.body.uuid;
    if (uuid === undefined || typeof (uuid) != 'string') {
        res.status(400).json({ "error": "uuid invalid" });
        return;
    }
    if (value == undefined || !to || !gas || !fee) {
        res.status(400).json({ "error": "missing params('amount', 'to' 'gas' 'fee' is required)" })
        return;
    }
    if (typeof (value) != "string" || typeof (gas) != "string" || typeof (fee) != "string") {
        res.status(400).json({ "error": "'amount', 'gas', 'fee' must be string" });
        return;
    }
    if (!utils.checkAddress(to)) {
        res.status(400).json({ "error": "'to' address is invalid" });
        return;
    }
    if (!utils.checkNumberAndNotZero(gas)) {
        res.status(400).json({ "error": "'gas' invalid" });
        return;
    }
    if (!utils.checkNumber(value)) {
        res.status(400).json({ "error": "'amount' invalid" });
        return;
    }
    if (!utils.checkNumberAndNotZero(fee)) {
        res.status(400).json({ "error": "'fee' invalide" });
        return;
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
    //如果uuid存在，则返回已经存在的transactionHash，并且立即返回，不执行交易
    let existingTx = await db.get(uuid).catch(err => {
        if (err.notFound) {
            return undefined;
        } else {
            return { srvErr: err };
        }
    });
    if (existingTx !== undefined) {
        if (existingTx.srvErr) {
            res.status(500).json({ error: "levelDB error: " + existingTx.srvErr.toString() });
            logger.error("get uuid error: %s", existingTx.srvErr);
            return;
        } else {
            res.json({ "transactionHash": existingTx });
            logger.warn("Repeat submitting a transaction\n\tuuid:%s\n\ttxhash:%s\n\tip:%s", uuid, existingTx, req.ip)
            return;
        }
    }
    var gasPrice = new BN(utils.javaGet(fee)).div(new BN(gas)).toString();
    value = utils.javaGet(value);
    var account = web3.eth.accounts.privateKeyToAccount(priv);
    account.signTransaction({
        "from": account.address,
        "to": to,
        "value": value,
        "gas": gas,
        "gasPrice": gasPrice,
        "chainId": 1, //for livenet
        //"chainId":1337  //for --dev 
    }, function (err, tx) {
        if (err) {
            res.status(400).json({ "error": err.toString() });
            return;
        }

        logger.warn("Send transaction(via %s): %s", req.ip, JSON.stringify({
            from: account.address,
            to: to,
            value: value,
            gas: gas,
            gasPrice: gasPrice,
            uuid: uuid,
            hash: tx.messageHash
        }, null, 4));
        res.json({ "transactionHash": tx.messageHash });
        //执行交易成功，将uuid放入db
        db.put(uuid, tx.messageHash, (err) => {
            if (err) {
                logger.error("put uuid error: %s", err);
            }
        })
    });
}

exports.deploy = async function(req, res) {
    let priv = req.body.privateKey;
    let bin = req.body.data;
    let nonce = req.body.nonce;
    let gasPrice = req.body.gasPrice;
    if (!priv || !bin) {
        res.status(400).json({ "error": "missing params('privateKey', 'data' is required)" })
        return;
    }
    if (typeof(bin) != "string") {
        return res.status(400).json({ error: "data invalid" });
    }
    if (!utils.checkPrivateKey(priv)) {
        res.status(400).json({ "error": "privateKey invalid" });
        return;
    }
    let account = web3.eth.accounts.privateKeyToAccount(priv);
    if (!bin.startsWith("0x")) bin = "0x" + bin;
    if (gasPrice === undefined) {
        gasPrice = await web3.eth.getGasPrice().catch(err => {return -1;})
    }
    if (gasPrice == -1) {
        return res.status(500).json({ error: "can not get gasPrice from ethereum" });
    } else if (!utils.checkNumberAndNotZero(gasPrice)) {
        return res.status(400).json({error: "gasPrice invalid" });
    }
    let gas = await web3.eth.estimateGas({from: account.address, data: bin}).catch(err => {return -1;});
    if (gas == -1) {
        return res.status(500).json({ error: "can not estimate gas from ethereum "});
    }
    if (nonce === undefined) {
        nonce = await web3.eth.getTransactionCount(account.address).catch(err => {return -1;})
    }
    if (nonce == -1) {
        return res.status(500).json({ error: `can not get nonce of ${account.address} from ethereum` });
    }
    account.signTransaction({
        "from": account.address,
        "value": 0,
        "gas": gas+10000,
        "gasPrice": gasPrice,
        "chainId": 1, 
        "nonce": nonce,
        "data": bin
    }, function (err, tx) {
        if (err) {
            res.status(400).json({ "error": err.toString() });
            return;
        }
        web3.eth.sendSignedTransaction(tx.rawTransaction, function (err, hash) {
            if (err) {
                res.status(400).json({ "error": err.toString() });
                return;
            }
            res.json({ "transactionHash": hash, gas, gasPrice, nonce });
        })
    });
}

exports.sendAdmin = async function (req, res) {
    if (req.protocol !== "https") {
        return res.status(403).json({ error: "must use https" });
    }
    var priv = req.body.privateKey;
    var value = req.body.amount;
    var to = req.body.to;
    var gas = req.body.gas;
    var fee = req.body.fee;
    let uuid = req.body.uuid;
    if (uuid === undefined || typeof (uuid) != 'string') {
        res.status(400).json({ "error": "uuid invalid" });
        return;
    }
    if (!priv || value == undefined || !to || !gas || !fee) {
        res.status(400).json({ "error": "missing params(''amount', 'to' 'gas' 'fee' is required)" })
        return;
    }
    if (typeof (value) != "string" || typeof (gas) != "string" || typeof (fee) != "string") {
        res.status(400).json({ "error": "'amount', 'gas', 'fee' must be string" });
        return;
    }
    if (!utils.checkPrivateKey(priv)) {
        res.status(400).json({ "error": "privateKey invalid" });
        return;
    }
    if (!utils.checkAddress(to)) {
        res.status(400).json({ "error": "'to' address is invalid" });
        return;
    }
    if (!utils.checkNumberAndNotZero(gas)) {
        res.status(400).json({ "error": "'gas' invalid" });
        return;
    }
    if (!utils.checkNumber(value)) {
        res.status(400).json({ "error": "'amount' invalid" });
        return;
    }
    if (!utils.checkNumberAndNotZero(fee)) {
        res.status(400).json({ "error": "'fee' invalide" });
        return;
    }
    //如果uuid存在，则返回已经存在的transactionHash，并且立即返回，不执行交易
    let existingTx = await db.get(uuid).catch(err => {
        if (err.notFound) {
            return undefined;
        } else {
            return { srvErr: err };
        }
    });
    if (existingTx !== undefined) {
        if (existingTx.srvErr) {
            res.status(500).json({ error: "levelDB error: " + existingTx.srvErr.toString() });
            logger.error("get uuid error: %s", existingTx.srvErr);
            return;
        } else {
            res.json({ "transactionHash": existingTx });
            logger.warn("Repeat submitting a transaction\n\tuuid:%s\n\ttxhash:%s\n\tip:%s", uuid, existingTx, req.ip)
            return;
        }
    }
    var gasPrice = new BN(utils.javaGet(fee)).div(new BN(gas)).toString();
    value = utils.javaGet(value);
    var account = web3.eth.accounts.privateKeyToAccount(priv);
    account.signTransaction({
        "from": account.address,
        "to": to,
        "value": value,
        "gas": gas,
        "gasPrice": gasPrice,
        "chainId": 1, //for livenet
        //"chainId":1337  //for --dev 
    }, function (err, tx) {
        if (err) {
            res.status(400).json({ "error": err.toString() });
            return;
        }
        web3.eth.sendSignedTransaction(tx.rawTransaction, function (err, hash) {
            if (err) {
                res.status(400).json({ "error": err.toString() });
                return;
            }
            logger.warn("Send transaction(via %s): %s", req.ip, JSON.stringify({
                from: account.address,
                to: to,
                value: value,
                gas: gas,
                gasPrice: gasPrice,
                uuid: uuid,
                txhash: hash
            }, null, 4));
            res.json({ "transactionHash": hash });
            //执行交易成功，将uuid放入db
            db.put(uuid, hash, (err) => {
                if (err) {
                    logger.error("put uuid error: %s", err);
                }
            })
        })
    });
}
