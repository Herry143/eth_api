const net = require('net');
var Web3 = require('web3');
var web3 = new Web3('/data/eth_blockdata_testnet/geth.ipc', net);
module.exports = web3;
