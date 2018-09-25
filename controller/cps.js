const web3 = require("../lib/web3");
const utils = require("../lib/utils");
const db = require("../lib/db");
const logger = require("../lib/logger");
const BN = web3.utils.BN;
const cpsAddress = "0xf239fab41de78533fa974b74d7605f1e68f8772e"; 
const transferABI = require("../lib/cpsABI").abi;
var cpsContract = new web3.eth.Contract(transferABI, cpsAddress);

exports.getBalance = function(req, res) {
    var address = req.params.address;
    if (!utils.checkAddress(address)) {
        res.status(400).json({ "error": "address is invalid" });
        return;
    }
    cpsContract.methods.balanceOf(address).call({}, (err, balance) => {
        res.json({"address": address, "balance": balance.toString()});
    });
}

exports.send = async function(req, res) {
    if (req.protocol !== "https") {
        return res.status(403).json({error: "must use https"});
    }
    var priv = req.body.privateKey;
    var value = req.body.amount;
    var to = req.body.to;
    var gas = req.body.gas;
    var fee = req.body.fee;
    let uuid = req.body.uuid;
    if (uuid === undefined || typeof(uuid) != 'string') {
        res.status(400).json({ "error": "uuid invalid" });
        return;
    }
    //var chainId = req.body.chainId;
    if (!priv || value == undefined || !to || !gas || !fee) {
        res.status(400).json({ "error": "missing params('privateKey', 'amount', 'to' 'gas' 'fee' is required)" })
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
        res.status(400).json({ "error": "'gas' invalid"});
        return;
    }
    if (!utils.checkNumber(value)) {
        res.status(400).json({"error": "'amount' invalid"});
        return;
    }
    if (!utils.checkNumberAndNotZero(fee)) {
        res.status(400).json({"error": "'fee' invalide"});
        return;
    }
    //如果uuid存在，则返回已经存在的transactionHash，并且立即返回，不执行交易
    let existingTx = await db.get(uuid).catch(err => {
        if (err.notFound) {
            return undefined;
        } else {
            return {srvErr: err};
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
    //JAVA侧始终按照1e8换算，但ethereum实际是1e18，所以要再乘以1e10
    fee = new BN(fee).mul(new BN("10000000000")).toString();
    //fee总价除以gas数量，得到gasPrice单价
    var gasPrice = new BN(fee).div(new BN(gas)).toString();
    var account = web3.eth.accounts.privateKeyToAccount(priv);
    var bin = cpsContract.methods.transfer(to, value).encodeABI();
    account.signTransaction({
        "from": account.address,
        "to": cpsAddress,
        "value": 0,
        "gas": gas,
        "gasPrice": gasPrice,
        "data": bin,
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
            res.json({ "transactionHash": hash });
            logger.warn("Send transaction(via %s): %s", req.ip, JSON.stringify({
                from: account.address,
                to: to,
                value: value,
                gas: gas,
                gasPrice: gasPrice,
                uuid: uuid,
                data: bin,
                txhash: hash
            }, null, 4));
            //执行交易成功，将uuid放入db
            db.put(uuid, hash, (err) => {
                if (err) {
                    logger.error("put uuid error: %s", err);
                }
            })
        })
    });
}

exports.getfee = function(req, res) {
    var from = req.query.from;
    var to = req.query.to;
    var amount = req.query.amount;
    if (!from || !to || !amount) {
        res.status(400).json({"error": "'from' 'to' 'amount' required"});
        return;
    }
    if (!utils.checkAddress(from)) {
        res.status(400).json({"error": "'from' address invalid"});
        return;
    }
    if (!utils.checkAddress(to)) {
        res.status(400).json({"error": "'to' address invalid"});
        return;
    }
    if (!/^[0-9]+$/.test(amount)) {
        res.status(400).json({"error": "'amount' invalid"});
        return;
    }
    //var gasP = cpsContract.methods.transfer(to, amount).estimateGas({from: from});
    var gasP = cpsContract.methods.transferMultiple([to], [amount], 1).estimateGas({from:from});
    var priceP = web3.eth.getGasPrice();
    Promise.all([gasP, priceP]).then(scope => {
        var gas = scope[0].toString();
        //单价乘以数量得总价，然后再除以1e10，换算到1e8上面
        var fee = new BN(scope[1]).mul(new BN(gas)).div(new BN("10000000000")).add(new BN('1')).toString();
        res.json({"gas": scope[0].toString(), "fee": fee});
    }, err => {
        res.status(400).json({"error": "can not estimate gas, maybe balance less than send amount"});
    });
}