const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("═══════════════════════════════════════════════");
  console.log("  MultiSig Wallet — Sepolia Deployment");
  console.log("═══════════════════════════════════════════════");
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    console.error("\n❌ Account has no ETH! Get Sepolia ETH from a faucet.");
    process.exit(1);
  }

  // ─── Real Wallet Addresses for Your Presentation ───
  // PASTE YOUR FRIENDS' PUBLIC ADDRESSES HERE
  const owner2Address = "0xD09Ac8D6b2E294cdd6002774A3a41Ae383448E13";
  const owner3Address = "0xd4eAcC38882e10DC3d8B665fC38244902d0cD4d0";

  const owners = [deployer.address, owner2Address, owner3Address];
  const requiredApprovals = 2;

  console.log("\n--- Wallet Owners ---");
  console.log("Owner 1 (You):", deployer.address);
  console.log("Owner 2 (Friend 1):", owner2Address);
  console.log("Owner 3 (Friend 2):", owner3Address);

  console.log("\n--- Deploying MultiSigWallet ---");
  console.log("Owners:", owners);
  console.log("Required Approvals:", requiredApprovals);

  const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
  const wallet = await MultiSigWallet.deploy(owners, requiredApprovals);
  await wallet.waitForDeployment();

  console.log("✅ MultiSigWallet deployed to:", wallet.target);

  // ─── Fund the wallet with a small amount ───
  console.log("\n--- Funding wallet with 0.001 ETH ---");
  const fundTx = await deployer.sendTransaction({
    to: wallet.target,
    value: ethers.parseEther("0.001"),
  });
  await fundTx.wait();

  const walletBalance = await ethers.provider.getBalance(wallet.target);
  console.log("Wallet balance:", ethers.formatEther(walletBalance), "ETH");

  // ─── Write deployment info for frontend ───
  const fs = require("fs");
  const path = require("path");

  const deploymentInfo = {
    network: "sepolia",
    chainId: 11155111,
    MultiSigWallet: wallet.target,
    owners: owners,
    requiredApprovals: requiredApprovals,
    deployedAt: new Date().toISOString(),
  };

  const frontendPublicDir = path.join(__dirname, "..", "frontend", "public");
  if (!fs.existsSync(frontendPublicDir)) {
    fs.mkdirSync(frontendPublicDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(frontendPublicDir, "deployment.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // Copy ABI
  const artifact = require("../artifacts/contracts/MultiSigWallet.sol/MultiSigWallet.json");
  fs.writeFileSync(
    path.join(frontendPublicDir, "abi.json"),
    JSON.stringify(artifact.abi, null, 2)
  );

  console.log("\n✅ Deployment info and ABI written to frontend/public/");
  console.log("\n═══════════════════════════════════════════════");
  console.log("  Deployment Complete!");
  console.log("  Contract:", wallet.target);
  console.log("  Network:  Sepolia (chainId: 11155111)");
  console.log("═══════════════════════════════════════════════");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
