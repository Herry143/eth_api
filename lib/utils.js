const web3 = require("../lib/web3");
const utils = require("../lib/utils");
const ethers=require('ethers')
//import { utils } from 'ethers';
const BN = web3.utils.BN;

exports.checkPrivateKey = function (priv) {
    if (/^0x[0-9a-fA-F]{64}$/.test(priv)) {
        return true;
    }
    return false;
}

exports.checkAddress = function (address) {
    if (/^0x[0-9a-fA-F]{40}$/.test(address) && web3.utils.isAddress(address)) {
        return true;
    }
    return false;
}

exports.checkBlockParam = function (block) {
    if (/^0x[0-9a-fA-F]{64}$/.test(block) || /[0-9]+/.test(block)) {
        return true;
    }
    return false;
}

exports.checkNumberAndNotZero = function (num) {
    return /^[1-9][0-9]*$/.test(num);
}

exports.checkNumber = function (num) {
    return /^[0-9]+$/.test(num);
}

//为JAVA对接，做位数处理，从JAVA得到的数据均乘以1e10,返回给JAVA的数据均除以1e10
exports.javaPush = function (num) {
    return new BN(num.toString()).div(new BN("10000000000")).toString();//除
}
exports.toEther = function (num) {
    return new BN(num.toString()).div(new BN("1000000000000000000")).toString();//除
}
exports.javaGet = function (num) {
    return new BN(num.toString()).mul(new BN('10000000000')).toString();//乘
}
exports.getGas = function(gasUsed, gasPrice){
    return ethers.formatEther(ethers.bigNumberify(gasUsed).mul(gasPrice));
  };
exports.formatFee =function(gasUsed, gasPrice){
    var fee=ethers.formatEther(ethers.bigNumberify(gasUsed).mul(gasPrice));
    return fee+" eth";
};
exports.formatGasPrice = function(gasPrice){
    return ethers.formatUnits(gasPrice, 'gwei')+" gwei";
  };
