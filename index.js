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
				InfuencersManager: new ethers.Contract( deploymentData["InfuencersManager"][chain.chainName]["address"] , InfuencersManager_raw.abi , chain.chainWallet ),
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

  // const timestamp = moment().format('YYYY-MM-DD HH:mm:ss'); // Format timestamp

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

  console.log(`THIS PRINTS AT THE END OF PROCESSING DATA`);

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
const runAutomations = async (provider_Sepolia, CampaignManager_Sepolia, SquawkProcessor_Sepolia) => {

            console.log(` ******************** Timestamp ${ new Date().toISOString()} counter: ${++counter} ********************`);
                
            //#region Sepolia
            const latestBlock = await provider_Sepolia.getBlock('latest'); // Fetch the latest block
            const latestBlockTime = latestBlock.timestamp; // Retrieve the timestamp of the latest block
            const date = new Date(latestBlockTime * 1000); // Convert the timestamp to a readable date
            console.log(`SEPOLIA: latestBlockTime ${latestBlockTime}`);


            //#region startTimes_Sepolia AUTOMATION 1
            const startTimes_Sepolia = await get_startTimes(CampaignManager_Sepolia); // get campaign manager start times
            console.log(`SEPOLIA: startTimes_Sepolia: `,startTimes_Sepolia);


            if (startTimes_Sepolia.length > 0) {

              let ready_startTimeIndex, ready_startTime, ready_campaign_uuid;

              console.log("CHECK POINT 1 startTimes_Sepolia");
              
              for (let i=0; i<startTimes_Sepolia.length; i++) {

                if (latestBlockTime >= startTimes_Sepolia[i]) {
                  ready_startTimeIndex = i; ready_startTime=startTimes_Sepolia[i];
                  console.log(`   SEPOLIA: Campaign with startTime: ${ready_startTime} and index: ${ready_startTimeIndex} is ready to start`);
                  break;
                }

              }

              console.log(`CHECK POINT 2 startTimes_Sepolia ready_startTimeIndex: ${ready_startTimeIndex} ready_startTime: ${ready_startTime}`);


              if (ready_startTime > 0) {

                console.log("CHECK POINT 3 startTimes_Sepolia");

                const pendingCampaignUIDs = await getPendingCampaigns(CampaignManager_Sepolia);  //get pending campaigns

                console.log("CHECK POINT 4 startTimes_Sepolia");

                for (let i=0; i<pendingCampaignUIDs.length; i++) {
                  const campaign_uuid = pendingCampaignUIDs[i];
                  const campaignSpecs = await get_Campaign_Specs(CampaignManager_Sepolia, campaign_uuid);
                  const campaignStartTime = Number(`${campaignSpecs.startTime}`)
                  console.log(`   SEPOLIA: campaignStartTime: ${campaignStartTime}`);

                  console.log("CHECK POINT 5 startTimes_Sepolia");

                  if (campaignStartTime <= ready_startTime) {
                      console.log(`   SEPOLIA: Campaign with startTime: ${campaignStartTime} and campaign_uuid: ${campaign_uuid} is ready to start`);
                      ready_campaign_uuid = `${campaign_uuid}`;
                      break;
                  }

                  console.log("CHECK POINT 6 startTimes_Sepolia");

                }


                console.log("CHECK POINT 7 startTimes_Sepolia");

                if (ready_campaign_uuid) {
                      console.log(`   SEPOLIA: Campaign with campaign_uuid: ${ready_campaign_uuid} is ready to run checkPendingCampainStatus`);

                      const response = await checkPendingCampainStatus(CampaignManager_Sepolia, ready_campaign_uuid);
                      console.log(`   checkPendingCampainStatus response: `,response);


                      if (response.msg === "OK") {
                        console.log(`   deleteStartOrEndTime will run`);
                        const response2 = await deleteStartOrEndTime(CampaignManager_Sepolia, true, ready_startTimeIndex);
                        console.log(`   deleteStartOrEndTime response2: `,response2);

                      } else console.log(`    SEPOLIA: checkPendingCampainStatus failed for campaign_uuid: ${ready_campaign_uuid} deleteStartOrEndTime will not run`);
                      
                } else console.log(`SEPOLIA: No Campaign is ready to start`);

                console.log("CHECK POINT 8 startTimes_Sepolia");

              } else console.log(`SEPOLIA ready_startTime is null ready_startTime: ${ready_startTime} ready_startTimeIndex: ${ready_startTimeIndex}`);
              

              console.log("*** CHECK POINT FINAL for startTimes_Sepolia ***");
            } else console.log(`SEPOLIA: startTimes_Sepolia is 0 length. No Pending Campaigns`);
            //#endregion


            console.log(`  `);
            console.log(`  `);


            //#region endTimes_Sepolia AUTOMATION 2
            const endTimes_Sepolia = await get_endTimes(CampaignManager_Sepolia); // get campaign manager start times
            console.log(`SEPOLIA: endTimes_Sepolia: `,endTimes_Sepolia);

            if (endTimes_Sepolia.length > 0) {

              let ready_endTimeIndex, ready_endTime, ready_campaign_uuid;

              console.log("CHECK POINT 1 endTimes_Sepolia");
              
              for (let i=0; i<endTimes_Sepolia.length; i++) {

                if (latestBlockTime >= endTimes_Sepolia[i]) {
                  ready_endTimeIndex = i; ready_endTime=endTimes_Sepolia[i];
                  console.log(`   SEPOLIA: Campaign with endTime: ${ready_endTime} and index: ${ready_endTimeIndex} is ready to end`);
                  break;
                }

              }

              console.log(`CHECK POINT 2 endTimes_Sepolia ready_startTimeIndex: ${ready_endTimeIndex} ready_endTime: ${ready_endTime}`);


              if (ready_endTime > 0) {

                console.log("CHECK POINT 3 endTimes_Sepolia");

                const activeCampaignUIDs = await getActiveCampaignUIDs(CampaignManager_Sepolia);  //get active campaigns

                console.log("CHECK POINT 4 endTimes_Sepolia");

                for (let i=0; i<activeCampaignUIDs.length; i++) {
                  const campaign_uuid = activeCampaignUIDs[i];
                  const campaignSpecs = await get_Campaign_Specs(CampaignManager_Sepolia, campaign_uuid);
                  const campaignEndTime = Number(`${campaignSpecs.endTime}`)
                  console.log(`   SEPOLIA: campaignEndTime: ${campaignEndTime}`);

                  console.log("CHECK POINT 5 endTimes_Sepolia");

                  if (campaignEndTime <= ready_endTime) {
                      console.log(`   SEPOLIA: Campaign with endTime: ${campaignEndTime} and campaign_uuid: ${campaign_uuid} is ready to end`);
                      ready_campaign_uuid = `${campaign_uuid}`;
                      break;
                  }

                  console.log("CHECK POINT 6 endTimes_Sepolia");

                }


                console.log("CHECK POINT 7 endTimes_Sepolia");

                if (ready_campaign_uuid) {
                      console.log(`   SEPOLIA: Campaign with campaign_uuid: ${ready_campaign_uuid} is ready to run checkActiveCampainStatus`);

                      const response = await checkActiveCampainStatus(CampaignManager_Sepolia, ready_campaign_uuid);
                      console.log(`   checkActiveCampainStatus response: `,response);


                      if (response.msg === "OK") {
                        console.log(`   deleteStartOrEndTime will run`);
                        const response2 = await deleteStartOrEndTime(CampaignManager_Sepolia, false, ready_endTimeIndex);
                        console.log(`   deleteStartOrEndTime response2: `,response2);

                      } else console.log(`    SEPOLIA: checkActiveCampainStatus failed for campaign_uuid: ${ready_campaign_uuid} deleteStartOrEndTime will not run`);
                      
                } else console.log(`SEPOLIA: No Campaign is ready to end`);

                console.log("CHECK POINT 8 endTimes_Sepolia");

              } else console.log(`SEPOLIA ready_endTime is null ready_endTime: ${ready_endTime} ready_endTimeIndex: ${ready_endTimeIndex}`);
              

              console.log("*** CHECK POINT FINAL for endTimes_Sepolia ***");
            } else console.log(`SEPOLIA: endTimes_Sepolia is 0 length. No Active Campaigns`);
            //#endregion


            console.log(`  `);
            console.log(`  `);


            //#region Expired Campaigns AUTOMATION 3
            console.log(`SEPOLIA: Expired Campaigns`);
            const expiredCampaignUIDs = await getExpiredCampaignUIDs(CampaignManager_Sepolia); 
            console.log(`SEPOLIA: expiredCampaignUIDs: `,expiredCampaignUIDs);

            if (expiredCampaignUIDs.length > 0) {
              console.log(`CHECK POINT 1 SEPOLIA: Expired Campaigns are ${expiredCampaignUIDs.length}`);

              for (let i=0; i<expiredCampaignUIDs.length; i++) {
                const campaign_uuid = expiredCampaignUIDs[i];
                console.log(`CHECK POINT 2 SEPOLIA expiredCampaignUIDs[i] campaign_uuid: ${campaign_uuid}`);

                const is_CampaignDistributionComplete = await isCampaignDistributionComplete(CampaignManager_Sepolia, campaign_uuid);
                console.log(`CHECK POINT 3 SEPOLIA: Expired campaign_uuid: ${campaign_uuid} is_CampaignDistributionComplete: ${is_CampaignDistributionComplete}`);

                // NOT NEEDED
                // if (is_CampaignDistributionComplete) {
                //   console.log(`CHECK POINT 4A SEPOLIA: Expired Campaign with is_CampaignDistributionComplete: ${is_CampaignDistributionComplete} and campaign_uuid: ${campaign_uuid} is ready to checkExpiredCampainStatus`);
                //   const response = await checkExpiredCampainStatus(CampaignManager_Sepolia, campaign_uuid);
                //   console.log(`   checkExpiredCampainStatus response: `,response);
                // } 
                
                if (!is_CampaignDistributionComplete)
                {
                  console.log(`CHECK POINT 4 SEPOLIA: Campaign with campaign_uuid: ${campaign_uuid} with is_CampaignDistributionComplete: ${is_CampaignDistributionComplete} will calculateDistributions`);
                  const response = await calculateDistributions(CampaignManager_Sepolia, campaign_uuid);
                  console.log(`   calculateDistributions response: `,response);
                }

                console.log(`CHECK POINT 5 SEPOLIA expiredCampaignUIDs[i] campaign_uuid: ${campaign_uuid} has finished calculateDistributions`);
              }

              console.log(`CHECK POINT 6 SEPOLIA End of Expired Campaigns Section`); 

            } else console.log(`SEPOLIA: No Expired Campaigns`);
            //#endregion


            console.log(`  `);
            console.log(`  `);


            //#region Ready For Payment Campaigns AUTOMATION 4  
            console.log(`SEPOLIA: Ready For Payment Campaigns`);
            let readyFroPaymentCampaignUIDs = await getReadyFroPaymentCampaignUIDs(CampaignManager_Sepolia); 
            console.log(`SEPOLIA: readyFroPaymentCampaignUIDs: `,readyFroPaymentCampaignUIDs);

            if (readyFroPaymentCampaignUIDs.length > 0) {
              console.log(`CHECK POINT 1 SEPOLIA: Ready For Payment Campaigns are ${readyFroPaymentCampaignUIDs.length}`);



              for (let i=0; i<readyFroPaymentCampaignUIDs.length; i++) {
                const campaign_uuid = readyFroPaymentCampaignUIDs[i];
                console.log(`CHECK POINT 2 SEPOLIA readyFroPaymentCampaignUIDs[i] campaign_uuid: ${campaign_uuid}`);

                const is_CampaignPaymentsComplete = await isCampaignPaymentsComplete(CampaignManager_Sepolia, campaign_uuid);
                console.log(`CHECK POINT 3 SEPOLIA: Ready For Payment campaign_uuid: ${campaign_uuid} is_CampaignPaymentsComplete: ${is_CampaignPaymentsComplete}`);
                

                const camp = await get_Campaign_Specs(CampaignManager_Sepolia, campaign_uuid);  //for case of camp.state===4 i.e. VOID


                if (!is_CampaignPaymentsComplete)
                {
                  console.log(`CHECK POINT 4A SEPOLIA: Campaign with campaign_uuid: ${campaign_uuid} with is_CampaignPaymentsComplete: ${is_CampaignPaymentsComplete} and campaign.state: ${camp.state} will makePayments`);
                  const response = await makePayments(CampaignManager_Sepolia, campaign_uuid);
                  console.log(`   makePayments response: `,response);
                }
                else if (is_CampaignPaymentsComplete || camp.state===4) {
                  console.log(`CHECK POINT 4B SEPOLIA: Campaign with campaign_uuid: ${campaign_uuid} with is_CampaignPaymentsComplete: ${is_CampaignPaymentsComplete} and campaign.state: ${camp.state} will move to completedCampaignUIDs`);
                  const response = await checkReadyForPaymentStatus(CampaignManager_Sepolia, campaign_uuid);
                  console.log(`   checkReadyForPaymentStatus response: `,response);
                }

                console.log(`CHECK POINT 5 SEPOLIA Ready For Payment campaign_uuid: ${campaign_uuid} has made payments`);
              }

              console.log(`CHECK POINT 6 SEPOLIA End of  Ready For Payment Campaigns Section`); 

            } else console.log(`SEPOLIA: No Ready For Payment Campaigns`);
            //#endregion


            console.log(`  `);
            console.log(`  `);


            //#region SquawkProcessor processSquawkData  AUTOMATION 5   
            console.log(`SEPOLIA: SquawkProcessor`);
            const {lastProcessedIndex, nonce} = await get_SquawkProcessor_nonce_lastProcessedIndex(SquawkProcessor_Sepolia); 
            console.log(`SEPOLIA: SquawkProcessor lastProcessedIndex: ${lastProcessedIndex} nonce: ${nonce}`);

            if (nonce >=1 && (lastProcessedIndex===0 || lastProcessedIndex+1 < nonce)) {
              console.log(`CHECK POINT 1 SEPOLIA: SquawkProcessor lastProcessedIndex: ${lastProcessedIndex} nonce: ${nonce}`);
              const response = await processSquawkData(SquawkProcessor_Sepolia);
              console.log(`CHECK POINT 2 SEPOLIA: processSquawkData response: `,response);
            } else console.log(`SEPOLIA: SquawkProcessor has no fresh data to process`);
            //#endregion


            console.log(`  `);
            console.log(`  `);
            //#endregion Sepolia







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

      await runAutomations(provider__Sepolia, CampaignManager__Sepolia, SquawkProcessor__Sepolia);

      // await runAutomations(provider_Base, CampaignManager_Base, SquawkProcessor_Base);



      //#region IF THE runAutomations WORKS THEN THE BELOW CODE WILL BE REMOVED
      // console.log(` ******************** Timestamp ${ new Date().toISOString()} counter: ${++counter} ********************`);
      
      // //#region Sepolia
      // const latestBlock = await provider_Sepolia.getBlock('latest'); // Fetch the latest block
      // const latestBlockTime = latestBlock.timestamp; // Retrieve the timestamp of the latest block
      // const date = new Date(latestBlockTime * 1000); // Convert the timestamp to a readable date
      // console.log(`SEPOLIA: latestBlockTime ${latestBlockTime}`);


      // //#region startTimes_Sepolia AUTOMATION 1
      // const startTimes_Sepolia = await get_startTimes(CampaignManager_Sepolia); // get campaign manager start times
      // console.log(`SEPOLIA: startTimes_Sepolia: `,startTimes_Sepolia);


      // if (startTimes_Sepolia.length > 0) {

      //   let ready_startTimeIndex, ready_startTime, ready_campaign_uuid;

      //   console.log("CHECK POINT 1 startTimes_Sepolia");
        
      //   for (let i=0; i<startTimes_Sepolia.length; i++) {

      //     if (latestBlockTime >= startTimes_Sepolia[i]) {
      //       ready_startTimeIndex = i; ready_startTime=startTimes_Sepolia[i];
      //       console.log(`   SEPOLIA: Campaign with startTime: ${ready_startTime} and index: ${ready_startTimeIndex} is ready to start`);
      //       break;
      //     }

      //   }

      //   console.log(`CHECK POINT 2 startTimes_Sepolia ready_startTimeIndex: ${ready_startTimeIndex} ready_startTime: ${ready_startTime}`);


      //   if (ready_startTime > 0) {

      //     console.log("CHECK POINT 3 startTimes_Sepolia");

      //     const pendingCampaignUIDs = await getPendingCampaigns(CampaignManager_Sepolia);  //get pending campaigns

      //     console.log("CHECK POINT 4 startTimes_Sepolia");

      //     for (let i=0; i<pendingCampaignUIDs.length; i++) {
      //       const campaign_uuid = pendingCampaignUIDs[i];
      //       const campaignSpecs = await get_Campaign_Specs(CampaignManager_Sepolia, campaign_uuid);
      //       const campaignStartTime = Number(`${campaignSpecs.startTime}`)
      //       console.log(`   SEPOLIA: campaignStartTime: ${campaignStartTime}`);

      //       console.log("CHECK POINT 5 startTimes_Sepolia");

      //       if (campaignStartTime <= ready_startTime) {
      //           console.log(`   SEPOLIA: Campaign with startTime: ${campaignStartTime} and campaign_uuid: ${campaign_uuid} is ready to start`);
      //           ready_campaign_uuid = `${campaign_uuid}`;
      //           break;
      //       }

      //       console.log("CHECK POINT 6 startTimes_Sepolia");

      //     }


      //     console.log("CHECK POINT 7 startTimes_Sepolia");

      //     if (ready_campaign_uuid) {
      //           console.log(`   SEPOLIA: Campaign with campaign_uuid: ${ready_campaign_uuid} is ready to run checkPendingCampainStatus`);

      //           const response = await checkPendingCampainStatus(CampaignManager_Sepolia, ready_campaign_uuid);
      //           console.log(`   checkPendingCampainStatus response: `,response);


      //           if (response.msg === "OK") {
      //             console.log(`   deleteStartOrEndTime will run`);
      //             const response2 = await deleteStartOrEndTime(CampaignManager_Sepolia, true, ready_startTimeIndex);
      //             console.log(`   deleteStartOrEndTime response2: `,response2);

      //           } else console.log(`    SEPOLIA: checkPendingCampainStatus failed for campaign_uuid: ${ready_campaign_uuid} deleteStartOrEndTime will not run`);
                
      //     } else console.log(`SEPOLIA: No Campaign is ready to start`);

      //     console.log("CHECK POINT 8 startTimes_Sepolia");

      //   } else console.log(`SEPOLIA ready_startTime is null ready_startTime: ${ready_startTime} ready_startTimeIndex: ${ready_startTimeIndex}`);
        

      //   console.log("*** CHECK POINT FINAL for startTimes_Sepolia ***");
      // } else console.log(`SEPOLIA: startTimes_Sepolia is 0 length. No Pending Campaigns`);
      // //#endregion


      // console.log(`  `);
      // console.log(`  `);


      // //#region endTimes_Sepolia AUTOMATION 2
      // const endTimes_Sepolia = await get_endTimes(CampaignManager_Sepolia); // get campaign manager start times
      // console.log(`SEPOLIA: endTimes_Sepolia: `,endTimes_Sepolia);

      // if (endTimes_Sepolia.length > 0) {

      //   let ready_endTimeIndex, ready_endTime, ready_campaign_uuid;

      //   console.log("CHECK POINT 1 endTimes_Sepolia");
        
      //   for (let i=0; i<endTimes_Sepolia.length; i++) {

      //     if (latestBlockTime >= endTimes_Sepolia[i]) {
      //       ready_endTimeIndex = i; ready_endTime=endTimes_Sepolia[i];
      //       console.log(`   SEPOLIA: Campaign with endTime: ${ready_endTime} and index: ${ready_endTimeIndex} is ready to end`);
      //       break;
      //     }

      //   }

      //   console.log(`CHECK POINT 2 endTimes_Sepolia ready_startTimeIndex: ${ready_endTimeIndex} ready_endTime: ${ready_endTime}`);


      //   if (ready_endTime > 0) {

      //     console.log("CHECK POINT 3 endTimes_Sepolia");

      //     const activeCampaignUIDs = await getActiveCampaignUIDs(CampaignManager_Sepolia);  //get active campaigns

      //     console.log("CHECK POINT 4 endTimes_Sepolia");

      //     for (let i=0; i<activeCampaignUIDs.length; i++) {
      //       const campaign_uuid = activeCampaignUIDs[i];
      //       const campaignSpecs = await get_Campaign_Specs(CampaignManager_Sepolia, campaign_uuid);
      //       const campaignEndTime = Number(`${campaignSpecs.endTime}`)
      //       console.log(`   SEPOLIA: campaignEndTime: ${campaignEndTime}`);

      //       console.log("CHECK POINT 5 endTimes_Sepolia");

      //       if (campaignEndTime <= ready_endTime) {
      //           console.log(`   SEPOLIA: Campaign with endTime: ${campaignEndTime} and campaign_uuid: ${campaign_uuid} is ready to end`);
      //           ready_campaign_uuid = `${campaign_uuid}`;
      //           break;
      //       }

      //       console.log("CHECK POINT 6 endTimes_Sepolia");

      //     }


      //     console.log("CHECK POINT 7 endTimes_Sepolia");

      //     if (ready_campaign_uuid) {
      //           console.log(`   SEPOLIA: Campaign with campaign_uuid: ${ready_campaign_uuid} is ready to run checkActiveCampainStatus`);

      //           const response = await checkActiveCampainStatus(CampaignManager_Sepolia, ready_campaign_uuid);
      //           console.log(`   checkActiveCampainStatus response: `,response);


      //           if (response.msg === "OK") {
      //             console.log(`   deleteStartOrEndTime will run`);
      //             const response2 = await deleteStartOrEndTime(CampaignManager_Sepolia, false, ready_endTimeIndex);
      //             console.log(`   deleteStartOrEndTime response2: `,response2);

      //           } else console.log(`    SEPOLIA: checkActiveCampainStatus failed for campaign_uuid: ${ready_campaign_uuid} deleteStartOrEndTime will not run`);
                
      //     } else console.log(`SEPOLIA: No Campaign is ready to end`);

      //     console.log("CHECK POINT 8 endTimes_Sepolia");

      //   } else console.log(`SEPOLIA ready_endTime is null ready_endTime: ${ready_endTime} ready_endTimeIndex: ${ready_endTimeIndex}`);
        

      //   console.log("*** CHECK POINT FINAL for endTimes_Sepolia ***");
      // } else console.log(`SEPOLIA: endTimes_Sepolia is 0 length. No Active Campaigns`);
      // //#endregion


      // console.log(`  `);
      // console.log(`  `);


      // //#region Expired Campaigns AUTOMATION 3
      // console.log(`SEPOLIA: Expired Campaigns`);
      // const expiredCampaignUIDs = await getExpiredCampaignUIDs(CampaignManager_Sepolia); 
      // console.log(`SEPOLIA: expiredCampaignUIDs: `,expiredCampaignUIDs);

      // if (expiredCampaignUIDs.length > 0) {
      //   console.log(`CHECK POINT 1 SEPOLIA: Expired Campaigns are ${expiredCampaignUIDs.length}`);

      //   for (let i=0; i<expiredCampaignUIDs.length; i++) {
      //     const campaign_uuid = expiredCampaignUIDs[i];
      //     console.log(`CHECK POINT 2 SEPOLIA expiredCampaignUIDs[i] campaign_uuid: ${campaign_uuid}`);

      //     const is_CampaignDistributionComplete = await isCampaignDistributionComplete(CampaignManager_Sepolia, campaign_uuid);
      //     console.log(`CHECK POINT 3 SEPOLIA: Expired campaign_uuid: ${campaign_uuid} is_CampaignDistributionComplete: ${is_CampaignDistributionComplete}`);

      //     // NOT NEEDED
      //     // if (is_CampaignDistributionComplete) {
      //     //   console.log(`CHECK POINT 4A SEPOLIA: Expired Campaign with is_CampaignDistributionComplete: ${is_CampaignDistributionComplete} and campaign_uuid: ${campaign_uuid} is ready to checkExpiredCampainStatus`);
      //     //   const response = await checkExpiredCampainStatus(CampaignManager_Sepolia, campaign_uuid);
      //     //   console.log(`   checkExpiredCampainStatus response: `,response);
      //     // } 
          
      //     if (!is_CampaignDistributionComplete)
      //     {
      //       console.log(`CHECK POINT 4 SEPOLIA: Campaign with campaign_uuid: ${campaign_uuid} with is_CampaignDistributionComplete: ${is_CampaignDistributionComplete} will calculateDistributions`);
      //       const response = await calculateDistributions(CampaignManager_Sepolia, campaign_uuid);
      //       console.log(`   calculateDistributions response: `,response);
      //     }

      //     console.log(`CHECK POINT 5 SEPOLIA expiredCampaignUIDs[i] campaign_uuid: ${campaign_uuid} has finished calculateDistributions`);
      //   }

      //   console.log(`CHECK POINT 6 SEPOLIA End of Expired Campaigns Section`); 

      // } else console.log(`SEPOLIA: No Expired Campaigns`);
      // //#endregion


      // console.log(`  `);
      // console.log(`  `);
  

      // //#region Ready For Payment Campaigns AUTOMATION 4  
      // console.log(`SEPOLIA: Ready For Payment Campaigns`);
      // let readyFroPaymentCampaignUIDs = await getReadyFroPaymentCampaignUIDs(CampaignManager_Sepolia); 
      // console.log(`SEPOLIA: readyFroPaymentCampaignUIDs: `,readyFroPaymentCampaignUIDs);

      // if (readyFroPaymentCampaignUIDs.length > 0) {
      //   console.log(`CHECK POINT 1 SEPOLIA: Ready For Payment Campaigns are ${readyFroPaymentCampaignUIDs.length}`);



      //   for (let i=0; i<readyFroPaymentCampaignUIDs.length; i++) {
      //     const campaign_uuid = readyFroPaymentCampaignUIDs[i];
      //     console.log(`CHECK POINT 2 SEPOLIA readyFroPaymentCampaignUIDs[i] campaign_uuid: ${campaign_uuid}`);

      //     const isCampaignPaymentsComplete = await isCampaignPaymentsComplete(CampaignManager_Sepolia, campaign_uuid);
      //     console.log(`CHECK POINT 3 SEPOLIA: Ready For Payment campaign_uuid: ${campaign_uuid} isCampaignPaymentsComplete: ${isCampaignPaymentsComplete}`);
          
      //     if (!isCampaignPaymentsComplete)
      //     {
      //       console.log(`CHECK POINT 4A SEPOLIA: Campaign with campaign_uuid: ${campaign_uuid} with isCampaignPaymentsComplete: ${isCampaignPaymentsComplete} will makePayments`);
      //       const response = await makePayments(CampaignManager_Sepolia, campaign_uuid);
      //       console.log(`   makePayments response: `,response);
      //     }
      //     else if (isCampaignPaymentsComplete || campaign_uuid.state==4) {
      //       console.log(`CHECK POINT 4B SEPOLIA: Campaign with campaign_uuid: ${campaign_uuid} with isCampaignPaymentsComplete: ${isCampaignPaymentsComplete} and  campaign_uuid.state: ${campaign_uuid.state} will move to completedCampaignUIDs`);
      //       const response = await checkReadyForPaymentStatus(CampaignManager_Sepolia, campaign_uuid);
      //       console.log(`   checkReadyForPaymentStatus response: `,response);
      //     }

      //     console.log(`CHECK POINT 5 SEPOLIA Ready For Payment campaign_uuid: ${campaign_uuid} has made payments`);
      //   }

      //   console.log(`CHECK POINT 6 SEPOLIA End of  Ready For Payment Campaigns Section`); 

      // } else console.log(`SEPOLIA: No Ready For Payment Campaigns`);
      // //#endregion


      // console.log(`  `);
      // console.log(`  `);


      // //#region SquawkProcessor processSquawkData  AUTOMATION 5   
      // console.log(`SEPOLIA: SquawkProcessor`);
      // const {lastProcessedIndex, nonce} = await get_SquawkProcessor_nonce_lastProcessedIndex(SquawkProcessor_Sepolia); 
      // console.log(`SEPOLIA: SquawkProcessor lastProcessedIndex: ${lastProcessedIndex} nonce: ${nonce}`);

      // if (nonce >=1 && (lastProcessedIndex===0 || lastProcessedIndex+1 < nonce)) {
      //   console.log(`CHECK POINT 1 SEPOLIA: SquawkProcessor lastProcessedIndex: ${lastProcessedIndex} nonce: ${nonce}`);
      //   const response = await processSquawkData(SquawkProcessor_Sepolia);
      //   console.log(`CHECK POINT 2 SEPOLIA: processSquawkData response: `,response);
      // } else console.log(`SEPOLIA: SquawkProcessor has no fresh data to process`);
      // //#endregion


      // console.log(`  `);
      // console.log(`  `);
      // //#endregion Sepolia
      //#endregion IF THE runAutomations WORKS THEN THE ABOVE CODE WILL BE REMOVED



      setTimeout(() => {
        startProcess()
      },5000);
  }  




  setTimeout(() => {
    startProcess()
  },2000);

}
startServer();







server.listen(port, () => {
  console.log(`Keepers Server is up on port ${port}`);
});