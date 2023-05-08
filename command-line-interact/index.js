const Web3 = require('web3');
const fs = require('fs');
const ethereum = require('./ethereum');
const { program } = require('commander');
const config = require('config');

let web3;
let netConfig;
let contract;

const CONTRACT_KEY_NAME = 'starportContractAddress';
const METHOD_KEY_NAME = 'dock';

// Private key
let testAccountPrivateKey = fs.readFileSync('./.secret').toString();

function init(chainName) {
    netConfig = config.get(chainName);
    if (!netConfig) {
        console.log('Config of chain (' + chainName + ') not exists');
        return false;
    }

    // Load contract abi, and init contract object
    const contractRawData = fs.readFileSync(netConfig.abi);
    const contractAbi = JSON.parse(contractRawData).abi;

    web3 = new Web3(netConfig.nodeAddress);
    web3.eth.handleRevert = true;
    contract = new web3.eth.Contract(contractAbi, netConfig[CONTRACT_KEY_NAME]);

    return true;
}

async function initialize() {
  // Set cross chain contract address
  await ethereum.sendTransaction(web3, netConfig.chainId, contract, 'setCrossChainContract', testAccountPrivateKey, [netConfig.crossChainContractAddress]);
}

async function registerDestnContract(chainName) {
  let destConfig = config.get(chainName);
  if (!destConfig) {
      console.log('Config of dest chain (' + chainName + ') not exists');
      return false;
  }

  const interface = JSON.parse(fs.readFileSync('./config/interface.json'));
  if (!interface[destConfig.interface]) {
    console.log('Interface of dest chain (' + chainName + ') not exists');
    return false;
  }

  // Register contract info for sending messages to other chains
  await ethereum.sendTransaction(web3, netConfig.chainId, contract, 'registerDestContract', testAccountPrivateKey,
    [METHOD_KEY_NAME, chainName, destConfig[CONTRACT_KEY_NAME], interface[destConfig.interface][METHOD_KEY_NAME]]);
}

async function trek(shipID, receiver, toChain) {
  await ethereum.sendTransaction(web3, netConfig.chainId, contract, 'trek', testAccountPrivateKey,
    [shipID, receiver, toChain]);
}

async function getShipInfo(shipID) {
  return await ethereum.contractCall(contract, '_dockedShips', [shipID]);
}

async function balanceOf(account) {
  return await ethereum.contractCall(contract, 'diamondBalanceOf', [account]);
}

async function synthesizeDiamond(shipID, amount) {
  await ethereum.sendTransaction(web3, netConfig.chainId, contract, 'synthesizeDiamond', testAccountPrivateKey, [shipID, amount]);
}

async function getDiamond() {
  await ethereum.sendTransaction(web3, netConfig.chainId, contract, 'diamondFaucet', testAccountPrivateKey, []);
}

async function createStarship(to, shipType) {
  await ethereum.sendTransaction(web3, netConfig.chainId, contract, 'createStarship', testAccountPrivateKey, [to, shipType]);
}

async function setStarports(starports) {
  await ethereum.sendTransaction(web3, netConfig.chainId, contract, 'setStarports', testAccountPrivateKey, [starports]);
}

async function getStarports() {
  return await ethereum.contractCall(contract, 'starports', []);
}

async function settleReward(shipID) {
  await ethereum.sendTransaction(web3, netConfig.chainId, contract, 'settleReward', testAccountPrivateKey, [shipID]);
}

(async function () {
  function list(val) {
    return val.split(',')
  }

  program
      .version('0.1.0')
      .option('-i, --initialize <chain name>', 'Initialize greeting contract')
      .option('-r, --register <chain name>,<dest chain name>', 'Register destination chain contract', list)
      .option('-t, --trek <chain name>,<ship ID>,<receiver>,<dest chain name>', 'Trek the ship to another starport', list)
      .option('-g, --get <chain name>,<ship ID>', 'Get ship information', list)
      .option('-s, --synthesize <chain name>,<ship ID>,<amount>', 'Synthesize diamonds', list)
      .option('-b, --balance <chain name>,<account>', 'Get diamond balance', list)
      .option('-c, --create <chain name>,<to>,<ship type>', 'Create a starship', list)
      .option('-d, --diamond <chain name>', 'Get some diamond for testing', list)
      .option('-ss, --set-starports <chain name>,"<galaxy>|<starport>..."', 'Set starports', list)
      .option('-sp, --starports <chain name>', 'Get starports', list)
      .option('-st, --settle <ship ID>', 'Settle rewards', list)
      .parse(process.argv);
console.log(program.opts())
  if (program.opts().initialize) {
      if (!init(program.opts().initialize)) {
          return;
      }
      await initialize();
  }
  else if (program.opts().register) {
      if (program.opts().register.length != 2) {
          console.log('2 arguments are needed, but ' + program.opts().register.length + ' provided');
          return;
      }
      
      if (!init(program.opts().register[0])) {
          return;
      }
      await registerDestnContract(program.opts().register[1]);
  }
  else if (program.opts().trek) {
    if (program.opts().trek.length != 4) {
        console.log('4 arguments are needed, but ' + program.opts().trek.length + ' provided');
        return;
    }

    if (!init(program.opts().trek[0])) {
        return;
    }
    await trek(program.opts().trek[1], program.opts().trek[2], program.opts().trek[3]);
  }
  else if (program.opts().get) {
    if (program.opts().get.length != 2) {
        console.log('2 arguments are needed, but ' + program.opts().get.length + ' provided');
        return;
    }

    if (!init(program.opts().get[0])) {
        return;
    }
    let ret = await getShipInfo(program.opts().get[1]);
    console.log('Ship info', JSON.stringify(ret));
  }
  else if (program.opts().synthesize) {
      if (program.opts().synthesize.length != 3) {
          console.log('3 arguments are needed, but ' + program.opts().synthesize.length + ' provided');
          return;
      }
      
      if (!init(program.opts().synthesize[0])) {
          return;
      }
      await synthesizeDiamond(program.opts().synthesize[1], program.opts().synthesize[2]);
  }
  else if (program.opts().balance) {
    if (program.opts().balance.length != 2) {
        console.log('2 arguments are needed, but ' + program.opts().balance.length + ' provided');
        return;
    }

    if (!init(program.opts().balance[0])) {
        return;
    }
    let ret = await balanceOf(program.opts().balance[1]);
    console.log('Diamond balance', ret);
  }
  else if (program.opts().create) {
    if (program.opts().create.length != 3) {
        console.log('3 arguments are needed, but ' + program.opts().create.length + ' provided');
        return;
    }

    if (!init(program.opts().create[0])) {
        return;
    }
    await createStarship(program.opts().create[1], program.opts().create[2]);
  }
  else if (program.opts()['setStarports']) {
      if (program.opts()['setStarports'].length < 2) {
          console.log('At least 2 arguments are needed');
          return;
      }
      
      if (!init(program.opts()['setStarports'][0])) {
          return;
      }

      let starports = [];
      let param = program.opts()['setStarports'].slice(1);
      for (let i = 0; i < param.length; i++) {
          let m = param[i].split('|');
          starports.push({
              galaxy: m[0],
              starportId: m[1]
          });
      }
      console.log('starports', starports)
      await setStarports(starports);
  }
  else if (program.opts().starports) {
      if (program.opts().starports.length != 1) {
          console.log('1 arguments are needed, but ' + program.opts().starports.length + ' provided');
          return;
      }
      
      if (!init(program.opts().starports[0])) {
          return;
      }
      let ret = await getStarports();
      console.log('starports', ret);
  }
  else if (program.opts().diamond) {
      if (program.opts().diamond.length != 1) {
          console.log('1 arguments are needed, but ' + program.opts().diamond.length + ' provided');
          return;
      }
      
      if (!init(program.opts().diamond[0])) {
          return;
      }
      await getDiamond();
  }
  else if (program.opts().settle) {
      if (program.opts().settle.length != 2) {
          console.log('2 arguments are needed, but ' + program.opts().settle.length + ' provided');
          return;
      }
      
      if (!init(program.opts().settle[0])) {
          return;
      }
      await settleReward(program.opts().settle[1]);
  }
}());