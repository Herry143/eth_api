const web3 = require("../lib/web3");
const utils = require("../lib/utils");

const BN = web3.utils.BN;

exports.getTxs = function(req, res) {
    var block = req.params.block;
    var address = req.params.address;
    if (!utils.checkBlockParam(block)) {
        res.status(400).json({ "error": "Expected block hash or block number, but got:" + block });
        return;
    }
    if (address && !utils.checkAddress(address)) {
        res.status(400).json({ "error": "address invalid" });
        return;
    }
    web3.eth.getBlock(block, true, (err, scope) => {
        if (err) {
            res.status(400).json({ "error": err.toString() });
            return;
        }
        if (scope == undefined || scope == null) {
            res.status(400).json({ "error": "can't find this block" });
            return;
        }
        var ret = [];
        if (address) {
            scope.transactions.forEach(item => {
                if (item.from == address || item.to == address) {
                    ret.push({ from: item.from, to: item.to,amout: utils.javaPush(item.value) });
                }
            });
        } else {
            scope.transactions.forEach(item => {
                ret.push({ from: item.from, to: item.to, amout: utils.javaPush(item.value) });
            });
        }
        res.json({ number: scope.number.toString(), hash: scope.hash, transactions: ret, timestamp: scope.timestamp.toString() });
    });
}