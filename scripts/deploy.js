const { ethers } = require("hardhat");

async function main() {
  const [deployer, owner2, owner3] = await ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  // Deploy MultiSigWallet (2-of-3)
  const owners = [deployer.address, owner2.address, owner3.address];
  const requiredApprovals = 2;

  console.log("\n--- Deploying MultiSigWallet ---");
  console.log("Owners:", owners);
  console.log("Required Approvals:", requiredApprovals);

  const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
  const wallet = await MultiSigWallet.deploy(owners, requiredApprovals);
  await wallet.waitForDeployment();

  console.log("MultiSigWallet deployed to:", wallet.target);

  // Deploy SimpleCounter for demo
  console.log("\n--- Deploying SimpleCounter ---");
  const SimpleCounter = await ethers.getContractFactory("SimpleCounter");
  const counter = await SimpleCounter.deploy();
  await counter.waitForDeployment();

  console.log("SimpleCounter deployed to:", counter.target);

  // Fund the wallet with 1 ETH
  console.log("\n--- Funding wallet with 1 ETH ---");
  const fundTx = await deployer.sendTransaction({
    to: wallet.target,
    value: ethers.parseEther("1"),
  });
  await fundTx.wait();

  const balance = await ethers.provider.getBalance(wallet.target);
  console.log("Wallet balance:", ethers.formatEther(balance), "ETH");

  // Write deployment info for frontend
  const fs = require("fs");
  const path = require("path");

  const deploymentInfo = {
    network: "localhost",
    MultiSigWallet: wallet.target,
    SimpleCounter: counter.target,
    owners: owners,
    requiredApprovals: requiredApprovals,
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
  console.log("\nDone!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
