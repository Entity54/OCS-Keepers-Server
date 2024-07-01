// Must have a .env file with the following variables process.env.NEYNAR_WEBHOOK_SECRET
// node index.js
'use strict';
require('dotenv').config();
const express = require('express');
const http = require('http');  
const exphbs = require('express-handlebars');
const path = require('path');       
// const moment = require('moment');  
const { createHmac } = require('crypto');   //Used in verifying incoming webhooks using signatures
const cors = require('cors');  // Import CORS

const BigNumber = require('bignumber.js');


//#region ************************** Smart Contracts Setup **************************
const { ethers, Wallet } = require("ethers");
// ************************** Import ABIs **************************
const CampaignManager_raw = require('./Abis/CampaignManager.json');
const InfuencersManager_raw = require('./Abis/InfluencersManager.json');
const CampaignAssets_raw = require('./Abis/CampaignAssets.json');
const SquawkProcessor_raw = require('./Abis/SquawkProcessor.json');
const deploymentData = require('./DeploymentData.json');

// import CampaignManager_raw from './Abis/CampaignManager.json';  
// import InfuencersManager_raw from './Abis/InfluencersManager.json';
// import CampaignAssets_raw from './Abis/CampaignAssets.json';
// import deploymentData from "./DeploymentData.json";


// ************************** KEYS **************************//
const RPC_BASE_KEY = process.env.VITE_RPC_BASE_KEY;
const PRIVATE_KEY = process.env.VITE_PRIVATE_KEY;
// const PRIVATE_KEY = process.env.VITE_PRIVATE_KEY2;
const public_signer = new Wallet(PRIVATE_KEY);   
// ************************** //

//#region ************************** Set up Chains **************************
const chainSpecs = {
	84532: {
		chainName: "base-sepolia",
		chainId: 84532,
		rpc: `https://api.developer.coinbase.com/rpc/v1/base-sepolia/${RPC_BASE_KEY}`,  //"https://sepolia.base.org",
		chainProvider: "", 
		chainWallet: "", //public_signer.connect(chainProvider),
		contracts: {
			CampaignManager: "", 
			InfuencersManager:"", 
      CampaignAssets: "",
      SquawkProcessor:"",
		},
	},
  8453: {
		chainName: "base",
		chainId: 8453,
		rpc: `https://api.developer.coinbase.com/rpc/v1/base/${RPC_BASE_KEY}`,
		chainProvider: "",  
		chainWallet: "", 
		contracts: {
			CampaignManager: "", 
			InfuencersManager:"", 
      CampaignAssets: "",
      SquawkProcessor:"",
		},
	},
}
//#endregion ************************** Set up Chains **************************

//#region ************************** Set up Contracts **************************
const setupContracts = async () => {
	Object.keys(chainSpecs).forEach( async (chainId) => {
		const chain = chainSpecs[chainId];
		chain.chainProvider = new ethers.providers.JsonRpcProvider(chain.rpc);
		chain.chainWallet = public_signer.connect(chain.chainProvider);
		if (Object.keys(deploymentData["CampaignManager"]).includes(chain.chainName))
		{
			chain.contracts =
			{
				CampaignManager: new ethers.Contract( deploymentData["CampaignManager"][chain.chainName]["address"] , CampaignManager_raw.abi , chain.chainWallet ), 
				InfuencersManager: new ethers.Contract( deploymentData["InfluencersManager"][chain.chainName]["address"] , InfuencersManager_raw.abi , chain.chainWallet ),
				CampaignAssets: new ethers.Contract( deploymentData["CampaignAssets"][chain.chainName]["address"] , CampaignAssets_raw.abi , chain.chainWallet ),
				SquawkProcessor: new ethers.Contract( deploymentData["SquawkProcessor"][chain.chainName]["address"] , SquawkProcessor_raw.abi , chain.chainWallet ),
			};

		} else chain.contracts = {};
	})
}
//#endregion ************************** Set up Contracts **************************


let provider_Admin, CampaignManager_admin, InfuencersManager_admin, CampaignAssets_admin, SquawkProcessor_admin;
//#endregion ************************** Smart Contracts Setup **************************




const port = process.env.PORT || 3003;


const app = express();
const server = http.createServer(app);

app.use(cors());  // Use CORS middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Storage for processed posts
let processedPosts = [];


// Set up Handlebars
app.engine('handlebars', exphbs.engine({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, './views'));

// Middleware for serving static files
app.use(express.static(path.join(__dirname, './public')));


app.get('/', (req, res) => {
  res.render('home', { posts: processedPosts });
});

//Endpoint to fetch latest posts
app.get('/latest-posts', (req, res) => {
  res.json(processedPosts);
});



app.post('/', async (req, res, next) => {
  const body = req.body;
  console.log(` *******> body: `,body);

  const timestamp = moment().format('YYYY-MM-DD HH:mm:ss'); // Format timestamp

  // const run_verifications = async (body,req) => {
  //     let _postActions = [];

  //     const sig = req.get("X-Neynar-Signature");
  //     if (sig)
  //     {
  //       console.log(`Received Webhook Signature: ${sig}`); 
  //       _postActions = await verifyWebhookSignature(body,sig);
  //       // console.log(`_postActions 1: `,_postActions);
  //     }
  //     else
  //     {
  //       console.log(`Webhook Signature missing from request headers`);
  //     }
  //     return _postActions;
  // };
  // const postActions = await run_verifications(body,req);


  // // Store the processed data
  // processedPosts.unshift(...postActions); // Add the new post to the beginning of the array
  // // processedPosts.unshift(post); // Add the new post to the beginning of the array

  // // Keep only the latest 20 posts
  // if (processedPosts.length > 20) {
  //   processedPosts = processedPosts.slice(0, 20);
  // }

  // console.log(`THIS PRINTS AT THE END OF PROCESSING DATA`);

  // Respond with success message
  res.status(201).send('Post received and processed successfully');
});

console.log(`${new Date()} server is up`);
//#endregion



  



//#region Smart Contracts Functions

//#region READ
const get_startTimes = async (Campaign_Manager) => {
  const startTimesBigNums =  await Campaign_Manager.get_startTimes();
  const startTimes = startTimesBigNums.map(startTimeBigNum => Number(`${startTimeBigNum}`));
  console.log(`get_startTimes startTimes: `,startTimes);
  return startTimes;
}

const get_endTimes = async (Campaign_Manager) => {
  const endTimesBigNums =  await Campaign_Manager.get_endTimes();
  const endTimes = endTimesBigNums.map(endTimeBigNum => Number(`${endTimeBigNum}`));
  console.log(`get_endTimes endTimes: `,endTimes);
  return endTimes;
}

const get_Campaign_Specs = async (Campaign_Manager, campaign_uuid) => {
	const campaigneSpecs =  await Campaign_Manager.getCampaign(campaign_uuid);
	// console.log(`campaigneSpecs: `,campaigneSpecs);
	return campaigneSpecs;
}

const getPendingCampaigns = async (Campaign_Manager) => {
	const pendingCampaignUIDs_BigNums =  await Campaign_Manager.get_pendingCampaignUIDs();
  const pendingCampaignUIDs = pendingCampaignUIDs_BigNums.map(uuid => Number(`${uuid}`));
	console.log(`pendingCampaignUIDs: `,pendingCampaignUIDs);
	return pendingCampaignUIDs;
}

const getActiveCampaignUIDs = async (Campaign_Manager) => {
	const activeCampaignUIDs_BigNums =  await Campaign_Manager.get_activeCampaignUIDs();
  const activeCampaignUIDs = activeCampaignUIDs_BigNums.map(uuid => Number(`${uuid}`));
	console.log(`activeCampaignUIDs: `,activeCampaignUIDs);
	return activeCampaignUIDs;
}

const getExpiredCampaignUIDs = async (Campaign_Manager) => {
	const expiredCampaignUIDs_BigNums =  await Campaign_Manager.get_expiredCampaignUIDs();
  const expiredCampaignUIDs = expiredCampaignUIDs_BigNums.map(uuid => Number(`${uuid}`));
	console.log(`expiredCampaignUIDs: `,expiredCampaignUIDs);
	return expiredCampaignUIDs;
}

const isCampaignDistributionComplete = async (Campaign_Manager, campaign__uuid) => {
	const is_CampaignDistributionComplete =  await Campaign_Manager.isCampaignDistributionComplete(campaign__uuid);
	console.log(`is_CampaignDistributionComplete: `,is_CampaignDistributionComplete);
	return is_CampaignDistributionComplete;
}

const getReadyFroPaymentCampaignUIDs = async (Campaign_Manager) => {
	const readyFroPaymentCampaignUIDs_BigNums =  await Campaign_Manager.get_readyFroPaymentCampaignUIDs();
  const  readyFroPaymentCampaignUIDs = readyFroPaymentCampaignUIDs_BigNums.map(uuid => Number(`${uuid}`));
	console.log(` readyFroPaymentCampaignUIDs: `, readyFroPaymentCampaignUIDs);
	return  readyFroPaymentCampaignUIDs;
}

const isCampaignPaymentsComplete = async (Campaign_Manager, campaign__uuid) => {
	const is_CampaignPaymentsComplete =  await Campaign_Manager.isCampaignPaymentsComplete(campaign__uuid);
	console.log(`is_CampaignPaymentsComplete: `,is_CampaignPaymentsComplete);
	return is_CampaignPaymentsComplete;
}

const get_SquawkProcessor_nonce_lastProcessedIndex = async (SquawkProcessor) => {
	const lastProcessedIndex =  await SquawkProcessor.lastProcessedIndex();
	const nonce =  await SquawkProcessor.nonce();
	console.log(`get_SquawkProcessor_nonce_lastProcessedIndex lastProcessedIndex: ${lastProcessedIndex} nonce: ${nonce}`);
	return {lastProcessedIndex: Number(`${lastProcessedIndex}`), nonce: Number(`${nonce}`)};
}
//#endregion READ



//#region WRITE
const checkPendingCampainStatus = async (Campaign_Manager, campaign__uuid) => {
	return new Promise (async (resolve,reject) => {
    console.log(`checkPendingCampainStatus campaign__uuid: ${campaign__uuid}`);

		try {
      const gasEstimate = await Campaign_Manager.estimateGas.checkPendingCampainStatus(campaign__uuid);
      const gasPremium = gasEstimate.mul(130).div(100);
      console.log(`checkPendingCampainStatus => gasEstimate: ${gasEstimate} gasPremium: ${gasPremium}`);


			const tx=  await Campaign_Manager.checkPendingCampainStatus(campaign__uuid, {gasLimit: gasPremium} );
			const receipt = await tx.wait();
			if (receipt.status === false) {
				throw new Error(`Transaction checkPendingCampainStatus failed`);
			}
			resolve({msg:`OK`, receipt, tx,});
		}
		catch (e) {
			console.log(` ********** while checkPendingCampainStatus an error occured ********** Error: `,e);
			resolve({msg:"Error", error: e});
		}
	});
}

const checkActiveCampainStatus = async (Campaign_Manager, campaign__uuid) => {
	return new Promise (async (resolve,reject) => {
    console.log(`checkActiveCampainStatus campaign__uuid: ${campaign__uuid}`);

		try {
      const gasEstimate = await Campaign_Manager.estimateGas.checkActiveCampainStatus(campaign__uuid);
      const gasPremium = gasEstimate.mul(130).div(100);
      console.log(`checkActiveCampainStatus => gasEstimate: ${gasEstimate} gasPremium: ${gasPremium}`);


			const tx=  await Campaign_Manager.checkActiveCampainStatus(campaign__uuid, {gasLimit: gasPremium} );
			const receipt = await tx.wait();
			if (receipt.status === false) {
				throw new Error(`Transaction checkActiveCampainStatus failed`);
			}
			resolve({msg:`OK`, receipt, tx,});
		}
		catch (e) {
			console.log(` ********** while checkActiveCampainStatus an error occured ********** Error: `,e);
			resolve({msg:"Error", error: e});
		}
	});
}

const checkExpiredCampainStatus = async (Campaign_Manager, campaign__uuid) => {
	return new Promise (async (resolve,reject) => {
    console.log(`checkExpiredCampainStatus campaign__uuid: ${campaign__uuid}`);

		try {
      const gasEstimate = await Campaign_Manager.estimateGas.checkExpiredCampainStatus(campaign__uuid);
      const gasPremium = gasEstimate.mul(130).div(100);
      console.log(`checkExpiredCampainStatus => gasEstimate: ${gasEstimate} gasPremium: ${gasPremium}`);


			const tx=  await Campaign_Manager.checkExpiredCampainStatus(campaign__uuid, {gasLimit: gasPremium} );
			const receipt = await tx.wait();
			if (receipt.status === false) {
				throw new Error(`Transaction checkExpiredCampainStatus failed`);
			}
			resolve({msg:`OK`, receipt, tx,});
		}
		catch (e) {
			console.log(` ********** while checkExpiredCampainStatus an error occured ********** Error: `,e);
			resolve({msg:"Error", error: e});
		}
	});
}

const calculateDistributions = async (Campaign_Manager, campaign__uuid) => {
	return new Promise (async (resolve,reject) => {
    console.log(`calculateDistributions campaign__uuid: ${campaign__uuid}`);

		try {
      const gasEstimate = await Campaign_Manager.estimateGas.calculateDistributions(campaign__uuid);
      const gasPremium = gasEstimate.mul(130).div(100);
      console.log(`calculateDistributions => gasEstimate: ${gasEstimate} gasPremium: ${gasPremium}`);


			const tx=  await Campaign_Manager.calculateDistributions(campaign__uuid, {gasLimit: gasPremium} );
			const receipt = await tx.wait();
			if (receipt.status === false) {
				throw new Error(`Transaction calculateDistributions failed`);
			}
			resolve({msg:`OK`, receipt, tx,});
		}
		catch (e) {
			console.log(` ********** while calculateDistributions an error occured ********** Error: `,e);
			resolve({msg:"Error", error: e});
		}
	});
}

const makePayments = async (Campaign_Manager, campaign__uuid) => {
	return new Promise (async (resolve,reject) => {
    console.log(`makePayments campaign__uuid: ${campaign__uuid}`);

		try {
      const gasEstimate = await Campaign_Manager.estimateGas.makePayments(campaign__uuid);
      const gasPremium = gasEstimate.mul(130).div(100);
      console.log(`makePayments => gasEstimate: ${gasEstimate} gasPremium: ${gasPremium}`);


			const tx=  await Campaign_Manager.makePayments(campaign__uuid, {gasLimit: gasPremium} );
			const receipt = await tx.wait();
			if (receipt.status === false) {
				throw new Error(`Transaction makePayments failed`);
			}
			resolve({msg:`OK`, receipt, tx,});
		}
		catch (e) {
			console.log(` ********** while makePayments an error occured ********** Error: `,e);
			resolve({msg:"Error", error: e});
		}
	});
}

const checkReadyForPaymentStatus = async (Campaign_Manager, campaign__uuid) => {
	return new Promise (async (resolve,reject) => {
    console.log(`checkReadyForPaymentStatus campaign__uuid: ${campaign__uuid}`);

		try {
      const gasEstimate = await Campaign_Manager.estimateGas.checkReadyForPaymentStatus(campaign__uuid);
      const gasPremium = gasEstimate.mul(130).div(100);
      console.log(`checkReadyForPaymentStatus => gasEstimate: ${gasEstimate} gasPremium: ${gasPremium}`);


			const tx=  await Campaign_Manager.checkReadyForPaymentStatus(campaign__uuid, {gasLimit: gasPremium} );
			const receipt = await tx.wait();
			if (receipt.status === false) {
				throw new Error(`Transaction checkReadyForPaymentStatus failed`);
			}
			resolve({msg:`OK`, receipt, tx,});
		}
		catch (e) {
			console.log(` ********** while checkReadyForPaymentStatus an error occured ********** Error: `,e);
			resolve({msg:"Error", error: e});
		}
	});
}

const deleteStartOrEndTime = async (Campaign_Manager, isStartTime, index ) => {
	return new Promise (async (resolve,reject) => {
    console.log(`deleteStartOrEndTime isStartTime: ${isStartTime} index: ${index}`);

		try {
			const tx=  await Campaign_Manager.deleteStartOrEndTime(isStartTime, index);
			const receipt = await tx.wait();
			if (receipt.status === false) {
				throw new Error(`Transaction deleteStartOrEndTime failed`);
			}
			resolve({msg:`OK`, receipt, tx,});
		}
		catch (e) {
			console.log(` ********** while deleteStartOrEndTime an error occured ********** Error: `,e);
			resolve({msg:"Error", error: e});
		}
	});
}

const processSquawkData = async (SquawkProcessor) => {
	return new Promise (async (resolve,reject) => {
    console.log(`processSquawkData is run`);

		try {
      const gasEstimate = await SquawkProcessor.estimateGas.processSquawkData(0);
      const gasPremium = gasEstimate.mul(130).div(100);
      console.log(`processSquawkData => gasEstimate: ${gasEstimate} gasPremium: ${gasPremium}`);


			const tx=  await SquawkProcessor.processSquawkData( 0, {gasLimit: gasPremium} );
			const receipt = await tx.wait();
			if (receipt.status === false) {
				throw new Error(`Transaction processSquawkData failed`);
			}
			resolve({msg:`OK`, receipt, tx,});
		}
		catch (e) {
			console.log(` ********** while processSquawkData an error occured ********** Error: `,e);
			resolve({msg:"Error", error: e});
		}
	});
}

//#endregion WRITE

//#endregion Smart Contracts Functions





//#region
const runAutomations = async (provider_Sepolia, CampaignManager_Sepolia, SquawkProcessor_Sepolia, chain_id_num) => {

  let _postActions = [], msg = "";
  const chainName = chainSpecs[chain_id_num].chainName;
  const CampaignManager_address = deploymentData["CampaignManager"][chainName]["address"];
  const SquawkProcessor_address = deploymentData["SquawkProcessor"][chainName]["address"];





            msg = ` *** CHAIN NAME: ${chainName.toUpperCase()}  Timestamp ${ new Date().toISOString()} counter: ${++counter} CampaignManager_address: ${CampaignManager_address} SquawkProcessor_address: ${SquawkProcessor_address} *** `;
            console.log(msg);
_postActions.push({message: msg});

            //#region Sepolia
            const latestBlock = await provider_Sepolia.getBlock('latest'); // Fetch the latest block
            const latestBlockTime = latestBlock.timestamp; // Retrieve the timestamp of the latest block
            const date = new Date(latestBlockTime * 1000); // Convert the timestamp to a readable date
            
            msg = `latestBlockTime ${latestBlockTime}`;
            console.log(msg);
_postActions.push({message: msg});


            //#region startTimes_Sepolia AUTOMATION 1
            const startTimes_Sepolia = await get_startTimes(CampaignManager_Sepolia); // get campaign manager start times
            
            msg = `startTimes: ${JSON.stringify(startTimes_Sepolia)}`;
            console.log(msg);
_postActions.push({message: msg});


            if (startTimes_Sepolia.length > 0) {

              let ready_startTimeIndex, ready_startTime, ready_campaign_uuid;

              msg = "CHECK POINT 1 startTimes"
              console.log(msg);
_postActions.push({message: msg});

              
              for (let i=0; i<startTimes_Sepolia.length; i++) {

                if (latestBlockTime >= startTimes_Sepolia[i]) {
                  ready_startTimeIndex = i; ready_startTime=startTimes_Sepolia[i];

                  msg = `Campaign with startTime: ${ready_startTime} and index: ${ready_startTimeIndex} is ready to start`;
                  console.log(msg);
_postActions.push({message: msg});
                  break;
                }

              }


              msg = `CHECK POINT 2 startTimes ready_startTimeIndex: ${ready_startTimeIndex} ready_startTime: ${ready_startTime}`;
              console.log(msg);
_postActions.push({message: msg});


              if (ready_startTime > 0) {

                msg = "CHECK POINT 3 startTimes";
                console.log(msg);
_postActions.push({message: msg});


                const pendingCampaignUIDs = await getPendingCampaigns(CampaignManager_Sepolia);  //get pending campaigns

                msg = `CHECK POINT 4 startTimes pendingCampaignUIDs: ${JSON.stringify(pendingCampaignUIDs)}`;
                console.log(msg);
_postActions.push({message: msg});


                for (let i=0; i<pendingCampaignUIDs.length; i++) {
                  const campaign_uuid = pendingCampaignUIDs[i];
                  const campaignSpecs = await get_Campaign_Specs(CampaignManager_Sepolia, campaign_uuid);
                  const campaignStartTime = Number(`${campaignSpecs.startTime}`)


                  msg = `CHECK POINT 5 startTimes campaignStartTime: ${campaignStartTime}`;
                  console.log(msg);
_postActions.push({message: msg});


                  if (campaignStartTime <= ready_startTime) {

                      msg = `Campaign with startTime: ${campaignStartTime} and campaign_uuid: ${campaign_uuid} is ready to start`;
                      console.log(msg);
_postActions.push({message: msg});


                      ready_campaign_uuid = `${campaign_uuid}`;
                      break;
                  }


                  msg = "CHECK POINT 6 startTimes";
                  console.log(msg);
_postActions.push({message: msg});


                }



                msg = "CHECK POINT 7 startTimes";
                console.log(msg);
_postActions.push({message: msg});



                if (ready_campaign_uuid) {
                      msg = `Campaign with campaign_uuid: ${ready_campaign_uuid} is ready to run checkPendingCampainStatus`;
                      console.log(msg);
_postActions.push({message: msg});

                      const response = await checkPendingCampainStatus(CampaignManager_Sepolia, ready_campaign_uuid);
                      
                      msg= `checkPendingCampainStatus response: ${JSON.stringify(response)}`;
                      console.log(msg);
_postActions.push({message: msg});


                      if (response.msg === "OK") {
                        msg = `deleteStartOrEndTime will run`;
                        console.log(msg);
_postActions.push({message: msg});

                        const response2 = await deleteStartOrEndTime(CampaignManager_Sepolia, true, ready_startTimeIndex);
                        
                        msg = `deleteStartOrEndTime response2: ${JSON.stringify(response2)}`;
                        console.log(msg);
_postActions.push({message: msg});

                      } else 
                      {
                        msg = `checkPendingCampainStatus failed for campaign_uuid: ${ready_campaign_uuid} deleteStartOrEndTime will not run`;
                        console.log(msg);
_postActions.push({message: msg});
                      }
                      
                } else 
                {
                  msg = `No Campaign is ready to start`;
                  console.log(msg);
_postActions.push({message: msg});
                }

                msg = "CHECK POINT 8 startTimes";
                console.log(msg);
_postActions.push({message: msg});


              } else 
              {
                msg = `ready_startTime is null ready_startTime: ${ready_startTime} ready_startTimeIndex: ${ready_startTimeIndex}`;
                console.log(msg);
_postActions.push({message: msg});
              }
              
              msg = "*** CHECK POINT FINAL for startTimes ***";
              console.log(msg);
_postActions.push({message: msg});
            } else 
            {
              msg = `startTimes is 0 length. No Pending Campaigns`;
              console.log(msg);
_postActions.push({message: msg});
            }
            //#endregion

_postActions.push({message: " "});
_postActions.push({message: " "});
            console.log(`  `);
            console.log(`  `);


            //#region endTimes_Sepolia AUTOMATION 2
            const endTimes_Sepolia = await get_endTimes(CampaignManager_Sepolia); // get campaign manager start times
           
            msg = `endTimes: ${JSON.stringify(endTimes_Sepolia)}`;
            console.log(msg);
_postActions.push({message: msg});


            if (endTimes_Sepolia.length > 0) {

              let ready_endTimeIndex, ready_endTime, ready_campaign_uuid;

              msg = "CHECK POINT 1 endTimes";
              console.log(msg);
_postActions.push({message: msg});

              
              for (let i=0; i<endTimes_Sepolia.length; i++) {

                if (latestBlockTime >= endTimes_Sepolia[i]) {
                  ready_endTimeIndex = i; ready_endTime=endTimes_Sepolia[i];

                  msg = `Campaign with endTime: ${ready_endTime} and index: ${ready_endTimeIndex} is ready to end`;
                  console.log(msg);
_postActions.push({message: msg});
                  break;
                }

              }

              msg = `CHECK POINT 2 endTimes ready_endTimeIndex: ${ready_endTimeIndex} ready_endTime: ${ready_endTime}`;
              console.log(msg);
_postActions.push({message: msg});


              if (ready_endTime > 0) {

                msg = "CHECK POINT 3 endTimes";
                console.log(msg);
_postActions.push({message: msg});

                const activeCampaignUIDs = await getActiveCampaignUIDs(CampaignManager_Sepolia);  //get active campaigns

                msg = `CHECK POINT 4 endTimes activeCampaignUIDs: ${JSON.stringify(activeCampaignUIDs)}`;
                console.log(msg);
_postActions.push({message: msg});


                for (let i=0; i<activeCampaignUIDs.length; i++) {
                  const campaign_uuid = activeCampaignUIDs[i];
                  const campaignSpecs = await get_Campaign_Specs(CampaignManager_Sepolia, campaign_uuid);
                  const campaignEndTime = Number(`${campaignSpecs.endTime}`)

                  msg = `CHECK POINT 5 endTimes campaignEndTime: ${campaignEndTime}`;
                  console.log(msg);
_postActions.push({message: msg});


                  if (campaignEndTime <= ready_endTime) {
                      msg = `Campaign with endTime: ${campaignEndTime} and campaign_uuid: ${campaign_uuid} is ready to end`;
                      console.log(msg);
_postActions.push({message: msg});

                      ready_campaign_uuid = `${campaign_uuid}`;
                      break;
                  }

                  msg = "CHECK POINT 6 endTimes";
                  console.log(msg);
_postActions.push({message: msg});
                }


                msg = "CHECK POINT 7 endTimes";
                console.log(msg);
_postActions.push({message: msg});


                if (ready_campaign_uuid) {
                      msg = `Campaign with campaign_uuid: ${ready_campaign_uuid} is ready to run checkActiveCampainStatus`;
                      console.log(msg);
_postActions.push({message: msg});

                      const response = await checkActiveCampainStatus(CampaignManager_Sepolia, ready_campaign_uuid);
                      
                      msg = `checkActiveCampainStatus response: ${JSON.stringify(response)}`;
                      console.log(msg);
_postActions.push({message: msg});


                      if (response.msg === "OK") {

                        msg = `deleteStartOrEndTime will run`;
                        console.log(msg);
_postActions.push({message: msg});  

                        const response2 = await deleteStartOrEndTime(CampaignManager_Sepolia, false, ready_endTimeIndex);

                        msg = `deleteStartOrEndTime response2: ${JSON.stringify(response2)}`;
                        console.log(msg);
_postActions.push({message: msg});

                      } else 
                      {
                        msg = `checkActiveCampainStatus failed for campaign_uuid: ${ready_campaign_uuid} deleteStartOrEndTime will not run`;
                        console.log(msg);
_postActions.push({message: msg});
                      }
                      
                } else 
                {
                  msg = `No Campaign is ready to end`;
                  console.log(msg);
_postActions.push({message: msg});
                }

                msg = "CHECK POINT 8 endTimes";
                console.log(msg);
_postActions.push({message: msg});
              } else 
              {
                msg = `ready_endTime is null ready_endTime: ${ready_endTime} ready_endTimeIndex: ${ready_endTimeIndex}`;
                console.log(msg);
_postActions.push({message: msg});
              }
              

              msg = "*** CHECK POINT FINAL for endTimes ***";
              console.log(msg);
_postActions.push({message: msg});
              
            } else 
            {
              msg = `endTimes_Sepolia is 0 length. No Active Campaigns`;
              console.log(msg);
_postActions.push({message: msg});
            }
            //#endregion


_postActions.push({message: " "});
_postActions.push({message: " "});
            console.log(`  `);
            console.log(`  `);


            //#region Expired Campaigns AUTOMATION 3
            msg = `Expired Campaigns`;
            console.log(msg);
_postActions.push({message: msg});
             
            const expiredCampaignUIDs = await getExpiredCampaignUIDs(CampaignManager_Sepolia); 

            msg = `expiredCampaignUIDs: ${JSON.stringify(expiredCampaignUIDs)}`;
            console.log(msg);
_postActions.push({message: msg});
             

            if (expiredCampaignUIDs.length > 0) {
              msg = `CHECK POINT 1 Expired Campaigns are ${expiredCampaignUIDs.length}`;
              console.log(msg);
_postActions.push({message: msg});

              for (let i=0; i<expiredCampaignUIDs.length; i++) {
                const campaign_uuid = expiredCampaignUIDs[i];

                msg = `CHECK POINT 2 expiredCampaignUIDs[i] campaign_uuid: ${campaign_uuid}`;
                console.log(msg);
_postActions.push({message: msg});

                const is_CampaignDistributionComplete = await isCampaignDistributionComplete(CampaignManager_Sepolia, campaign_uuid);
                
                msg = `CHECK POINT 3 Expired campaign_uuid: ${campaign_uuid} is_CampaignDistributionComplete: ${is_CampaignDistributionComplete}`;
                console.log(msg);
_postActions.push({message: msg});

                // NOT NEEDED
                // if (is_CampaignDistributionComplete) {
                //   console.log(`CHECK POINT 4A SEPOLIA: Expired Campaign with is_CampaignDistributionComplete: ${is_CampaignDistributionComplete} and campaign_uuid: ${campaign_uuid} is ready to checkExpiredCampainStatus`);
                //   const response = await checkExpiredCampainStatus(CampaignManager_Sepolia, campaign_uuid);
                //   console.log(`   checkExpiredCampainStatus response: `,response);
                // } 
                
                if (!is_CampaignDistributionComplete)
                {
                  msg = `CHECK POINT 4 Campaign with campaign_uuid: ${campaign_uuid} with is_CampaignDistributionComplete: ${is_CampaignDistributionComplete} will calculateDistributions`;
                  console.log(msg);
_postActions.push({message: msg});
                  
                  const response = await calculateDistributions(CampaignManager_Sepolia, campaign_uuid);

                  msg = `calculateDistributions response: ${JSON.stringify(response)}`;
                  console.log(msg);
_postActions.push({message: msg});
                }

                msg = `CHECK POINT 5 expiredCampaignUIDs[i] campaign_uuid: ${campaign_uuid} has finished calculateDistributions`;
                console.log(msg);
_postActions.push({message: msg});
              }

              msg = `CHECK POINT 6 End of Expired Campaigns Section`;
              console.log(msg);
_postActions.push({message: msg});
            } else 
            {
              msg = `No Expired Campaigns`;
              console.log(msg);
_postActions.push({message: msg});
            }
            //#endregion


            msg = " ********** ********** ********** ********** ********** ";
            console.log(msg);
_postActions.push({message: msg});


            //#region Ready For Payment Campaigns AUTOMATION 4  

            msg = `Ready For Payment Campaigns`;
            console.log(msg);
_postActions.push({message: msg});
           
            let readyFroPaymentCampaignUIDs = await getReadyFroPaymentCampaignUIDs(CampaignManager_Sepolia); 

            msg = `readyFroPaymentCampaignUIDs: ${JSON.stringify(readyFroPaymentCampaignUIDs)}`;
            console.log(msg);
_postActions.push({message: msg});
            

            if (readyFroPaymentCampaignUIDs.length > 0) {

              msg = `CHECK POINT 1 Ready For Payment Campaigns are ${readyFroPaymentCampaignUIDs.length}`;
              console.log(msg);
_postActions.push({message: msg});

              for (let i=0; i<readyFroPaymentCampaignUIDs.length; i++) {
                const campaign_uuid = readyFroPaymentCampaignUIDs[i];

                msg = `CHECK POINT 2 readyFroPaymentCampaignUIDs[i] campaign_uuid: ${campaign_uuid}`;
                console.log(msg);
_postActions.push({message: msg});

                const is_CampaignPaymentsComplete = await isCampaignPaymentsComplete(CampaignManager_Sepolia, campaign_uuid);

                msg = `CHECK POINT 3 Ready For Payment campaign_uuid: ${campaign_uuid} is_CampaignPaymentsComplete: ${is_CampaignPaymentsComplete}`;
                console.log(msg);
_postActions.push({message: msg});

                const camp = await get_Campaign_Specs(CampaignManager_Sepolia, campaign_uuid);  //for case of camp.state===4 i.e. VOID


                if (!is_CampaignPaymentsComplete && camp.state!==4)
                {

                  msg = `CHECK POINT 4A Campaign with campaign_uuid: ${campaign_uuid} with is_CampaignPaymentsComplete: ${is_CampaignPaymentsComplete} and campaign.state: ${camp.state} will makePayments`;
                  console.log(msg);
_postActions.push({message: msg});

                  const response = await makePayments(CampaignManager_Sepolia, campaign_uuid);

                  msg = `makePayments response: ${JSON.stringify(response)}`;
                  console.log(msg);
_postActions.push({message: msg});
                }
                else if (is_CampaignPaymentsComplete || camp.state===4) {

                  msg = `CHECK POINT 4B Campaign with campaign_uuid: ${campaign_uuid} with is_CampaignPaymentsComplete: ${is_CampaignPaymentsComplete} and campaign.state: ${camp.state} will move to completedCampaignUIDs`;
                  console.log(msg);
_postActions.push({message: msg});

                  const response = await checkReadyForPaymentStatus(CampaignManager_Sepolia, campaign_uuid);

                  msg = `checkReadyForPaymentStatus response: ${JSON.stringify(response)}`;
                  console.log(msg);
_postActions.push({message: msg});
                }

                msg = `CHECK POINT 5 Ready For Payment campaign_uuid: ${campaign_uuid} has made payments`;
                console.log(msg);
_postActions.push({message: msg});
              }

              msg = `CHECK POINT 6 End of Ready For Payment Campaigns Section`;
              console.log(msg);
_postActions.push({message: msg});
            } else 
            {
              msg = `No Ready For Payment Campaigns`;
              console.log(msg);
_postActions.push({message: msg});
            }
            //#endregion


            msg = " ********** ********** ********** ********** ********** ";
            console.log(msg);
_postActions.push({message: msg});


            //#region SquawkProcessor processSquawkData  AUTOMATION 5   
            msg = `SquawkProcessor`;
            console.log(msg);
_postActions.push({message: msg});
             
            const {lastProcessedIndex, nonce} = await get_SquawkProcessor_nonce_lastProcessedIndex(SquawkProcessor_Sepolia); 

            msg = `SquawkProcessor lastProcessedIndex: ${lastProcessedIndex} nonce: ${nonce}`;
            console.log(msg);
_postActions.push({message: msg});

            if (nonce >=1 && (lastProcessedIndex===0 || lastProcessedIndex+1 < nonce)) {

              msg = `CHECK POINT 1 SquawkProcessor lastProcessedIndex: ${lastProcessedIndex} nonce: ${nonce}`;
              console.log(msg);
_postActions.push({message: msg});

              const response = await processSquawkData(SquawkProcessor_Sepolia);

              msg = `CHECK POINT 2 processSquawkData response: ${JSON.stringify(response)}`;
              console.log(msg);
_postActions.push({message: msg});
            } else 
            {
              msg = `SquawkProcessor has no fresh data to process`;
              console.log(msg);
_postActions.push({message: msg});
            }
            //#endregion


            msg = " |||********** ********** ********** ********** **********||| ";
            console.log(msg);
_postActions.push({message: msg});
            //#endregion Sepolia


return _postActions;
}
//#endregion






let counter = 0
// ******************************
const startServer = async () => {

  //#region One Off PROCEDURES
  
  setupContracts();    // Setup Smart Contracts - Establish connection to all smart contracts in both Base and Base Sepolia

  let chainObject
  let provider__Sepolia, CampaignManager__Sepolia, InfuencersManager__Sepolia, CampaignAssets__Sepolia, SquawkProcessor__Sepolia;
  let provider_Base, CampaignManager_Base, InfuencersManager_Base, CampaignAssets_Base, SquawkProcessor_Base;

  chainObject = chainSpecs[84532];
  provider__Sepolia 			    = chainObject.chainProvider;
  CampaignManager__Sepolia 	= chainObject.contracts.CampaignManager;
  // InfuencersManager__Sepolia = chainObject.contracts.InfuencersManager;
  // CampaignAssets__Sepolia    = chainObject.contracts.CampaignAssets;
  SquawkProcessor__Sepolia   = chainObject.contracts.SquawkProcessor;

  chainObject = chainSpecs[8453];
  provider_Base 			    = chainObject.chainProvider;
  CampaignManager_Base 	= chainObject.contracts.CampaignManager;
  // InfuencersManager_Base = chainObject.contracts.InfuencersManager;
  // CampaignAssets_Base    = chainObject.contracts.CampaignAssets;
  SquawkProcessor_Base   = chainObject.contracts.SquawkProcessor;
  

  console.log(` ******************** Server is starting ******************** `);
  console.log(`Timestmap ${ new Date().toISOString} counter: ${counter}`);
  // console.log(`deploymentData: `,deploymentData);
  console.log(` ******************** `);
  //#endregion One Off PROCEDURES





  const startProcess = async () => {
    
    let postActions1 = [], postActions2 = [];

    postActions1 = await runAutomations(provider__Sepolia, CampaignManager__Sepolia, SquawkProcessor__Sepolia, 84532);

    postActions2 = await runAutomations(provider_Base, CampaignManager_Base, SquawkProcessor_Base, 8453);



  // Store the processed data
  processedPosts.push(...postActions1,...postActions2); 
  // processedPosts.unshift(post); // Add the new post to the beginning of the array

  // Keep only the latest 100 posts
  if (processedPosts.length > 100) {
    processedPosts = processedPosts.slice(-100);
  }

  console.log(`THIS PRINTS AT THE END OF PROCESSING DATA`);



      setTimeout(() => {
        startProcess()
      },10000);
  }  




  setTimeout(() => {
    startProcess()
  },2000);

}
startServer();







server.listen(port, () => {
  console.log(`Keepers Server is up on port ${port}`);
});