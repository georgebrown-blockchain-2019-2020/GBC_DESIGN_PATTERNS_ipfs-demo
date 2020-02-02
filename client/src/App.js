import React, { Component } from "react";
import SimpleStorageContract from "./contracts/SimpleStorage.json";
import IPFSInboxContract from "./contracts/IPFSInbox.json"
import getWeb3 from "./getWeb3";
import ipfs from "./ipfs"
import "./App.css";
import truffleContract from "truffle-contract";
class App extends Component {
  state = { web3: null, 
    accounts: null, 
    contract: null,
    ipfsHash:null,
    formIPFS: "",
    formAddress: "",
    receivedIPFS: "",
    receivedFile: ""
  };
  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      // const deployedNetwork = SimpleStorageContract.networks[networkId];
      // const instance = new web3.eth.Contract(
      //   SimpleStorageContract.abi,
      //   deployedNetwork && deployedNetwork.address,
      // );
      const Contract = truffleContract(IPFSInboxContract);
      Contract.setProvider(web3.currentProvider);
      const instance = await Contract.deployed();
      this.setState({web3,accounts,contract: instance});
      this.setEventListeners();
      // Set web3, accounts, and contract to the state, and then proceed with an
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };
  setEventListeners () {
    this.state.contract.inboxResponse().on('data',result => {
      console.log(result);
      this.setState({receivedIPFS: result.args[0]})
    });
  };
  captureFile = (event)=> {
    event.stopPropagation();
    event.preventDefault();
    const file = event.target.files[0];
    let reader= new window.FileReader();
    reader.readAsArrayBuffer(file)
    reader.onloadend = ()=> this.convertToBuffer(reader)
  };
  convertToBuffer = async(reader)=>{
    const buffer = await Buffer.from(reader.result);
    this.setState({buffer})
  };
  onIPFSSubmit = async (event)=>{
    event.preventDefault();
    console.log(ipfs)
    await ipfs.add(this.state.buffer, (err,ipfsHash)=>{
      this.setState({ipfsHash:ipfsHash[0].hash})
    })
  }
  handleChangeAddress(event){
    this.setState({formAddress: event.target.value});
  }
  handleChangeIPFS(event){
    this.setState({formIPFS: event.target.value});
  }
  handleSend(event){
    event.preventDefault();
    const contract = this.state.contract;
    const account = this.state.accounts[0];
    document.getElementById('new-notification-form').reset();
    this.setState({showNotification: true});
    contract.sendIPFS(this.state.formAddress,this.state.formIPFS, {from: account})
    .then(result => {
      if(result.logs){
        this.setState({receivedIPFS: result.logs.args[0]})
      }
      this.setState({formAddress: ""});
      this.setState({formIPFS: ""});
    })
  }
  handleReceiveIPFS(event){
    event.preventDefault();
    const contract = this.state.contract;
    const account = this.state.accounts[0];
    contract.checkInbox({from: account}).then(result => console.log(result))
  }
  async getFile(event){
    event.preventDefault();
    await ipfs.files.get(this.state.formIPFS,(err,files)=>{
      files.forEach((file) => {
        console.log(file.path)
        console.log("File content >> ",file.content.toString('utf8'))
        this.setState({receivedFile: file.content.toString('utf8')})
    })
    })
  }
  render() {
    return (
      <div className="App">
        <h2>1. Add a file to IPFS here</h2>
        <form id="ipfs-hash-form" className="scep-form" onSubmit= {this.onIPFSSubmit.bind(this)}>
          <input type="file" onChange={this.captureFile} />
          <button type="submit">Send it</button>
        </form>
          <p> The IPFS hash is {this.state.ipfsHash}</p>
        <h2>2. Send notifications here</h2>
        <form id="new-notification-form" className="scep-form" onSubmit={this.handleSend.bind(this)}>
          <label>
            Receiver Address:
            <input type="text"
            value={this.state.value} onChange={this.handleChangeAddress.bind(this)}/>
          </label>
          <label>
            IPFS Address:
            <input type="text"
            value={this.state.value}
            onChange={this.handleChangeIPFS.bind(this)} />
          </label>
          <input type="submit" value="Submit" />
        </form>
        <h2> 3. RECEIVE NOTIFICATIONS</h2>
        <button onClick={this.handleReceiveIPFS.bind(this)}>GET IPFS Hash</button>
        <p>{this.state.receivedIPFS}</p>
        <h2>4. GET FILE FROM IPFS</h2>
        <label>
            IPFS Address:
            <input type="text"
            value={this.state.value}
            onChange={this.handleChangeIPFS.bind(this)} />
        </label>
        <button onClick={this.getFile.bind(this)}>GET FILE INFORMATION</button>
        <p>{this.state.receivedFile}</p>
      </div>
    );
  }
}

export default App;
