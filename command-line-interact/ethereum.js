module.exports = {
  async sendTransaction(
    provider, chainId, targetContract, methodName, accountPrivateKey, arguments) {
    try {
      const account =
      provider.eth.accounts.privateKeyToAccount(accountPrivateKey)
          .address; 
      const to = targetContract.options.address;
      const nonce = provider.utils.numberToHex(
        await provider.eth.getTransactionCount(account)); 
      const data = targetContract.methods[methodName]
        .apply(targetContract.methods, arguments)
        .encodeABI();  // encode ABI
      const gas = await targetContract.methods[methodName].apply(null, arguments).estimateGas({from: account});
      let gasPrice = await provider.eth.getGasPrice();

      const tx = { account, to, chainId, data, nonce, gasPrice, gas };
      console.log(tx);

      let signTx =
        await provider.eth.accounts.signTransaction(tx, accountPrivateKey);
      let ret = await provider.eth.sendSignedTransaction(signTx.rawTransaction);
      console.log('gasUsed: ' + methodName + ' ' + ret.gasUsed);
      return ret;
    } catch (e) {
      console.error(e);
    }
  },
  // query info from blockchain node
  async contractCall(targetContract, method, arguments) {
    let methodObj =
      targetContract.methods[method].apply(targetContract.methods, arguments);
    let ret = await methodObj.call({});
    return ret;
  }
}