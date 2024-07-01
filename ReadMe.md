## Keepers Server

The task of the Keepers server is to call certain functions to ensure that the smart contracts stay updated

---

Analytically

1. **checkPendingCampainStatus** on CampaignManager.sol to move a campaign from Pending to Active when it reaches startTime
2. **checkActiveCampainStatus** on CampaignManager.sol to move a campaign from Active to Expired when it reaches end time
3. **calculateDistributions** on CampaignManager.sol for each Expired Campaign to calculate weights of each infuencer based on his/her points so that we know how much funds they are eligible to receive
4. **checkExpiredCampainStatus** on CampaignManager.sol for Expired Campaigns when the previous step calculateDistributions is complete , move them to readyFroPaymentCampaignUIDs campaigns
5. **makePayments** on CampaignManager.sol for campaigns that are in readyFroPaymentCampaignUIDs
6. **checkReadyForPaymentStatus** on CampaignManager.sol to move campaign from Ready2Payment to Completed

> When a campaign has paid funds then it will be of state Paid otherwise (if no points were scored) Void and the campaign owner can get his ETH back.

7. **processSquawkData** on SquawkProcessor.sol to process any unprocessed squawk messages of the form:

```
    struct Squawk {
        uint[] data;
        uint created_at;
        uint code;
        uint user_fid;
        uint user_followers;
        address cast_hash;
        address replyTo_cast_hash;
        string embeded_string;
        uint nonce;
        uint processed; // 0 for not processed, 1 for processed
    }
```

stored on squawkBox array when the Webhooks Server called

```
    function addSquawkData(Squawk[] memory newSquawks) external OnlyAdmins

```

---

## Installation

```
npm install
```

## Run

```
npm start
```
