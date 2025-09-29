import { expect } from "chai";
import { ethers } from "hardhat";

describe("CreateLayeredOption Integration Test", function () {
  let layeredOptions;
  let wbtc, usdc;
  let owner, user1;
  let btcPriceFeed;

  before(async function () {
    [owner, user1] = await ethers.getSigners();
    
    // Use deployed contract addresses from latest deployment
    const contractAddresses = {
      LAYERED_OPTIONS_TRADING: "0xcd9948d810c4e8c2144c4e2fb84786502e6bedc8",
      MOCK_WBTC: "0x70b0efc2b112d37cfeb2641cfde41b8677375935", 
      STABLECOIN: "0x43d109c41de6beab2e1d151d932bcc6318fa8f50",
      BTC_PRICE_FEED: "0x2574b49a1ded38c9f239682769e3c3e708797c7a"
    };

    // Connect to deployed contracts
    layeredOptions = await ethers.getContractAt(
      "CitreaLayeredOptionsTrading", 
      contractAddresses.LAYERED_OPTIONS_TRADING
    );
    
    wbtc = await ethers.getContractAt(
      "MockERC20", 
      contractAddresses.MOCK_WBTC
    );
    
    usdc = await ethers.getContractAt(
      "MockERC20", 
      contractAddresses.STABLECOIN
    );
    
    btcPriceFeed = await ethers.getContractAt(
      "MockPriceFeed",
      contractAddresses.BTC_PRICE_FEED
    );

    console.log("Connected to contracts:");
    console.log("LayeredOptions:", contractAddresses.LAYERED_OPTIONS_TRADING);
    console.log("WBTC:", contractAddresses.MOCK_WBTC);
    console.log("USDC:", contractAddresses.STABLECOIN);
  });

  it("Should test createLayeredOption function with proper parameters", async function () {
    try {
      // Check if WBTC is supported asset
      const isSupported = await layeredOptions.supportedAssets(wbtc.address);
      console.log("WBTC supported:", isSupported);
      
      if (!isSupported) {
        console.log("WBTC not supported, skipping test");
        return;
      }

      // Get current BTC price from price feed
      const priceData = await btcPriceFeed.latestRoundData();
      const currentPrice = priceData.answer;
      console.log("Current BTC price:", ethers.utils.formatUnits(currentPrice, 8), "USD");
      
      // Mint some WBTC to user1 for collateral
      await wbtc.mint(user1.address, ethers.utils.parseUnits("1", 8)); // 1 WBTC
      
      // Check user1's WBTC balance
      const userBalance = await wbtc.balanceOf(user1.address);
      console.log("User1 WBTC balance:", ethers.utils.formatUnits(userBalance, 8));
      
      // Approve LayeredOptions to spend user's WBTC (for collateral)
      await wbtc.connect(user1).approve(
        layeredOptions.address, 
        ethers.utils.parseUnits("1", 8)
      );
      
      // Calculate required collateral
      const strikePrice = ethers.utils.parseUnits("50000", 8); // $50k strike
      const collateralRequired = await layeredOptions.calculateCollateralRequired(
        wbtc.address,
        strikePrice,
        0 // CALL option
      );
      console.log("Collateral required:", ethers.utils.formatUnits(collateralRequired, 8), "WBTC");
      
      // Create option parameters
      const maturity = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days from now
      const premium = ethers.utils.parseUnits("500", 6); // 500 USDC premium
      const parentTokenId = 0; // Root option
      const optionType = 0; // CALL
      
      console.log("Creating layered option with parameters:");
      console.log("- Base Asset:", wbtc.address);
      console.log("- Strike Price:", ethers.utils.formatUnits(strikePrice, 8), "USD");
      console.log("- Maturity:", new Date(maturity * 1000).toISOString());
      console.log("- Premium:", ethers.utils.formatUnits(premium, 6), "USDC");
      console.log("- Option Type: CALL");
      
      // Call createLayeredOption
      const tx = await layeredOptions.connect(user1).createLayeredOption(
        wbtc.address,     // baseAsset
        strikePrice,      // strikePrice
        maturity,         // maturity
        premium,          // premium
        parentTokenId,    // parentTokenId (0 for root)
        optionType        // optionType (CALL)
      );
      
      const receipt = await tx.wait();
      console.log("Transaction hash:", tx.hash);
      console.log("Gas used:", receipt.gasUsed.toString());
      
      // Check for LayeredOptionCreated event
      const events = receipt.events.filter(e => e.event === "LayeredOptionCreated");
      if (events.length > 0) {
        const event = events[0];
        const tokenId = event.args.tokenId;
        console.log("✅ Option created successfully!");
        console.log("Token ID:", tokenId.toString());
        
        // Verify option was created by checking balance
        const balance = await layeredOptions.balanceOf(user1.address, tokenId);
        expect(balance).to.equal(1);
        console.log("✅ User1 owns the option token");
        
        // Get option details
        const option = await layeredOptions.getOption(tokenId);
        console.log("Option details:");
        console.log("- Base Asset:", option.baseAsset);
        console.log("- Strike Price:", ethers.utils.formatUnits(option.strikePrice, 8), "USD");
        console.log("- Premium:", ethers.utils.formatUnits(option.premium, 6), "USDC");
        console.log("- Option Type:", option.optionType === 0 ? "CALL" : "PUT");
        console.log("- Settled:", option.isSettled);
        
      } else {
        console.log("❌ No LayeredOptionCreated event found");
        throw new Error("Option creation failed - no event emitted");
      }
      
    } catch (error) {
      console.error("❌ Test failed:", error.message);
      if (error.reason) {
        console.error("Revert reason:", error.reason);
      }
      throw error;
    }
  });

  it("Should check contract ABI compatibility", async function () {
    // Test if all expected functions exist
    const functions = [
      'createLayeredOption',
      'createChildOption', 
      'purchaseOption',
      'settleOptionTree',
      'claimSettlement',
      'calculateParentProfit',
      'calculateChildProfit',
      'getOptionChildren',
      'settlements'
    ];
    
    for (const funcName of functions) {
      try {
        const func = layeredOptions[funcName];
        expect(func).to.not.be.undefined;
        console.log(`✅ Function ${funcName} exists`);
      } catch (error) {
        console.log(`❌ Function ${funcName} missing`);
        throw new Error(`Function ${funcName} not found in contract ABI`);
      }
    }
  });
});