const web3 = require("../lib/web3");

// var Web3 = require('web3');
// var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"))
const utils = require("../lib/utils");
const request = require('request');
const BN = web3.utils.BN;
const ethers = require('ethers');
//import { ethers } from 'ethers';

var ret=[];
var address="0xC739fa3f4B87AED49037567De6ecfA26e9eAa554";
var txs = [ 
    {
    from: '0x236f9f97e0e62388479bf9e5ba4889e46b0273c3',
    to: '0xc739fa3f4b87aed49037567de6ecfa26e9eaa554',
    value: 36767000000000000000,//wei 30000000000 0.00000003
    gasPrice: 29700000000,  //wei
    gasUsed: 21000,
    blockHash: '0xdb7a7553ee12e9ce32c7e2a84e3b51b34777c23c3fdfde1988e110cfa40956ff',
    blockNumber: 4166057,
    status: 0,
    timestamp: 1502908167,
    hash: '0x4b5574e3ce726bc5da6ee342e7081e62c90bea08c93b00d8e8be32ee9e6acf5f',
    kind: 0 
},
{ 
    from: '0xceee9139776ee0d26a1a8be24da415678b911c66',
    to: '0xc739fa3f4b87aed49037567de6ecfa26e9eaa554',
    value: 836800000000000000,
    gasPrice: 20000000000,
    gasUsed: 21000,
    blockHash: '0x8e168198a18e13374c1357ce8666da6f39d3d94b05e749c9bfa75920c327dd0a',
    blockNumber: 4164537,
    status: 0,
    timestamp: 1502876529,
    hash: '0xcc6eae213d93d40d8dcf601fa98c65b441bc8419e374d5e73d828b1c7a2a9a55',
    kind: 0 
}];
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
   console.log(ret)
} catch (e) {
    console.log(e)
}
