const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("MultiSigWallet", function () {
  // ──────────────────────────────────────────────────────────
  //  Shared Fixture
  // ──────────────────────────────────────────────────────────

  async function deployWalletFixture() {
    const [owner1, owner2, owner3, nonOwner, recipient] =
      await ethers.getSigners();

    const owners = [owner1.address, owner2.address, owner3.address];
    const requiredApprovals = 2; // 2-of-3

    const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
    const wallet = await MultiSigWallet.deploy(owners, requiredApprovals);

    // Fund the wallet with 10 ETH
    await owner1.sendTransaction({
      to: wallet.target,
      value: ethers.parseEther("10"),
    });

    // Deploy SimpleCounter for calldata tests
    const SimpleCounter = await ethers.getContractFactory("SimpleCounter");
    const counter = await SimpleCounter.deploy();

    return {
      wallet,
      counter,
      owner1,
      owner2,
      owner3,
      nonOwner,
      recipient,
      owners,
      requiredApprovals,
    };
  }

  // ──────────────────────────────────────────────────────────
  //  Constructor Tests
  // ──────────────────────────────────────────────────────────

  describe("Constructor", function () {
    it("Should set owners and requiredApprovals correctly", async function () {
      const { wallet, owners, requiredApprovals } =
        await loadFixture(deployWalletFixture);

      const contractOwners = await wallet.getOwners();
      expect(contractOwners.length).to.equal(owners.length);
      for (let i = 0; i < owners.length; i++) {
        expect(contractOwners[i]).to.equal(owners[i]);
      }
      expect(await wallet.requiredApprovals()).to.equal(requiredApprovals);
    });

    it("Should mark each address as an owner", async function () {
      const { wallet, owner1, owner2, owner3 } =
        await loadFixture(deployWalletFixture);

      expect(await wallet.isOwner(owner1.address)).to.be.true;
      expect(await wallet.isOwner(owner2.address)).to.be.true;
      expect(await wallet.isOwner(owner3.address)).to.be.true;
    });

    it("Should revert on empty owners array", async function () {
      const MultiSigWallet =
        await ethers.getContractFactory("MultiSigWallet");
      await expect(MultiSigWallet.deploy([], 1)).to.be.revertedWithCustomError(
        MultiSigWallet,
        "InvalidOwnerCount"
      );
    });

    it("Should revert on zero requiredApprovals", async function () {
      const [owner1] = await ethers.getSigners();
      const MultiSigWallet =
        await ethers.getContractFactory("MultiSigWallet");
      await expect(
        MultiSigWallet.deploy([owner1.address], 0)
      ).to.be.revertedWithCustomError(MultiSigWallet, "InvalidRequiredApprovals");
    });

    it("Should revert when requiredApprovals > owners.length", async function () {
      const [owner1] = await ethers.getSigners();
      const MultiSigWallet =
        await ethers.getContractFactory("MultiSigWallet");
      await expect(
        MultiSigWallet.deploy([owner1.address], 5)
      ).to.be.revertedWithCustomError(MultiSigWallet, "InvalidRequiredApprovals");
    });

    it("Should revert on duplicate owner addresses", async function () {
      const [owner1] = await ethers.getSigners();
      const MultiSigWallet =
        await ethers.getContractFactory("MultiSigWallet");
      await expect(
        MultiSigWallet.deploy([owner1.address, owner1.address], 1)
      ).to.be.revertedWithCustomError(MultiSigWallet, "DuplicateOwner");
    });

    it("Should revert on zero-address owner", async function () {
      const MultiSigWallet =
        await ethers.getContractFactory("MultiSigWallet");
      await expect(
        MultiSigWallet.deploy([ethers.ZeroAddress], 1)
      ).to.be.revertedWithCustomError(MultiSigWallet, "ZeroAddress");
    });
  });

  // ──────────────────────────────────────────────────────────
  //  Submit Transaction Tests
  // ──────────────────────────────────────────────────────────

  describe("submitTransaction", function () {
    it("Should allow an owner to submit a transaction and return txId", async function () {
      const { wallet, owner1, recipient } =
        await loadFixture(deployWalletFixture);

      const tx = await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, ethers.parseEther("1"), "0x");

      const receipt = await tx.wait();
      expect(await wallet.getTransactionCount()).to.equal(1);

      const [to, value, data, approvalCount, executed] =
        await wallet.getTransaction(0);
      expect(to).to.equal(recipient.address);
      expect(value).to.equal(ethers.parseEther("1"));
      expect(data).to.equal("0x");
      expect(approvalCount).to.equal(0);
      expect(executed).to.be.false;
    });

    it("Should emit TransactionSubmitted event", async function () {
      const { wallet, owner1, recipient } =
        await loadFixture(deployWalletFixture);

      await expect(
        wallet
          .connect(owner1)
          .submitTransaction(recipient.address, ethers.parseEther("1"), "0x")
      )
        .to.emit(wallet, "TransactionSubmitted")
        .withArgs(0, owner1.address, recipient.address, ethers.parseEther("1"), "0x");
    });

    it("Should revert when non-owner tries to submit", async function () {
      const { wallet, nonOwner, recipient } =
        await loadFixture(deployWalletFixture);

      await expect(
        wallet
          .connect(nonOwner)
          .submitTransaction(recipient.address, ethers.parseEther("1"), "0x")
      ).to.be.revertedWithCustomError(wallet, "NotOwner");
    });
  });

  // ──────────────────────────────────────────────────────────
  //  Approve Transaction Tests
  // ──────────────────────────────────────────────────────────

  describe("approveTransaction", function () {
    it("Should allow an owner to approve a pending transaction", async function () {
      const { wallet, owner1, owner2, recipient } =
        await loadFixture(deployWalletFixture);

      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, ethers.parseEther("1"), "0x");

      await wallet.connect(owner1).approveTransaction(0);

      const [, , , approvalCount] = await wallet.getTransaction(0);
      expect(approvalCount).to.equal(1);
      expect(await wallet.approved(0, owner1.address)).to.be.true;
    });

    it("Should emit Approved event", async function () {
      const { wallet, owner1, recipient } =
        await loadFixture(deployWalletFixture);

      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, ethers.parseEther("1"), "0x");

      await expect(wallet.connect(owner1).approveTransaction(0))
        .to.emit(wallet, "Approved")
        .withArgs(0, owner1.address);
    });

    it("Should revert when non-owner tries to approve", async function () {
      const { wallet, owner1, nonOwner, recipient } =
        await loadFixture(deployWalletFixture);

      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, ethers.parseEther("1"), "0x");

      await expect(
        wallet.connect(nonOwner).approveTransaction(0)
      ).to.be.revertedWithCustomError(wallet, "NotOwner");
    });

    it("Should revert on double-approve by same owner", async function () {
      const { wallet, owner1, recipient } =
        await loadFixture(deployWalletFixture);

      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, ethers.parseEther("1"), "0x");

      await wallet.connect(owner1).approveTransaction(0);

      await expect(
        wallet.connect(owner1).approveTransaction(0)
      ).to.be.revertedWithCustomError(wallet, "TransactionAlreadyApproved");
    });

    it("Should revert when approving a non-existent transaction", async function () {
      const { wallet, owner1 } = await loadFixture(deployWalletFixture);

      await expect(
        wallet.connect(owner1).approveTransaction(999)
      ).to.be.revertedWithCustomError(wallet, "TransactionDoesNotExist");
    });

    it("Should revert when approving an already-executed transaction", async function () {
      const { wallet, owner1, owner2, recipient } =
        await loadFixture(deployWalletFixture);

      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, ethers.parseEther("1"), "0x");
      await wallet.connect(owner1).approveTransaction(0);
      await wallet.connect(owner2).approveTransaction(0);
      await wallet.connect(owner1).executeTransaction(0);

      await expect(
        wallet.connect(owner1).approveTransaction(0)
      ).to.be.revertedWithCustomError(wallet, "TransactionAlreadyExecuted");
    });
  });

  // ──────────────────────────────────────────────────────────
  //  Revoke Approval Tests
  // ──────────────────────────────────────────────────────────

  describe("revokeApproval", function () {
    it("Should allow an owner to revoke their approval", async function () {
      const { wallet, owner1, recipient } =
        await loadFixture(deployWalletFixture);

      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, ethers.parseEther("1"), "0x");
      await wallet.connect(owner1).approveTransaction(0);

      expect(await wallet.approved(0, owner1.address)).to.be.true;

      await wallet.connect(owner1).revokeApproval(0);

      expect(await wallet.approved(0, owner1.address)).to.be.false;
      const [, , , approvalCount] = await wallet.getTransaction(0);
      expect(approvalCount).to.equal(0);
    });

    it("Should emit ApprovalRevoked event", async function () {
      const { wallet, owner1, recipient } =
        await loadFixture(deployWalletFixture);

      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, ethers.parseEther("1"), "0x");
      await wallet.connect(owner1).approveTransaction(0);

      await expect(wallet.connect(owner1).revokeApproval(0))
        .to.emit(wallet, "ApprovalRevoked")
        .withArgs(0, owner1.address);
    });

    it("Should revert when revoking without prior approval", async function () {
      const { wallet, owner1, owner2, recipient } =
        await loadFixture(deployWalletFixture);

      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, ethers.parseEther("1"), "0x");

      await expect(
        wallet.connect(owner2).revokeApproval(0)
      ).to.be.revertedWithCustomError(wallet, "TransactionNotApproved");
    });

    it("Should revert when revoking on an executed transaction", async function () {
      const { wallet, owner1, owner2, recipient } =
        await loadFixture(deployWalletFixture);

      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, ethers.parseEther("1"), "0x");
      await wallet.connect(owner1).approveTransaction(0);
      await wallet.connect(owner2).approveTransaction(0);
      await wallet.connect(owner1).executeTransaction(0);

      await expect(
        wallet.connect(owner1).revokeApproval(0)
      ).to.be.revertedWithCustomError(wallet, "TransactionAlreadyExecuted");
    });

    it("Revoking approval should block execution until re-approved", async function () {
      const { wallet, owner1, owner2, owner3, recipient } =
        await loadFixture(deployWalletFixture);

      // Submit and get 2 approvals (meets threshold)
      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, ethers.parseEther("1"), "0x");
      await wallet.connect(owner1).approveTransaction(0);
      await wallet.connect(owner2).approveTransaction(0);

      // Owner1 revokes → only 1 approval now
      await wallet.connect(owner1).revokeApproval(0);

      // Should fail: only 1 of 2 required
      await expect(
        wallet.connect(owner2).executeTransaction(0)
      ).to.be.revertedWithCustomError(wallet, "InsufficientApprovals");

      // Owner3 approves → back to 2 approvals
      await wallet.connect(owner3).approveTransaction(0);

      // Now it should succeed
      await expect(wallet.connect(owner1).executeTransaction(0)).to.not.be
        .reverted;
    });
  });

  // ──────────────────────────────────────────────────────────
  //  Execute Transaction Tests
  // ──────────────────────────────────────────────────────────

  describe("executeTransaction", function () {
    it("Should execute when approvalCount >= requiredApprovals", async function () {
      const { wallet, owner1, owner2, recipient } =
        await loadFixture(deployWalletFixture);

      const sendAmount = ethers.parseEther("1");

      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, sendAmount, "0x");
      await wallet.connect(owner1).approveTransaction(0);
      await wallet.connect(owner2).approveTransaction(0);

      const balanceBefore = await ethers.provider.getBalance(recipient.address);

      await wallet.connect(owner1).executeTransaction(0);

      const balanceAfter = await ethers.provider.getBalance(recipient.address);
      expect(balanceAfter - balanceBefore).to.equal(sendAmount);

      const [, , , , executed] = await wallet.getTransaction(0);
      expect(executed).to.be.true;
    });

    it("Should emit Executed event", async function () {
      const { wallet, owner1, owner2, recipient } =
        await loadFixture(deployWalletFixture);

      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, ethers.parseEther("1"), "0x");
      await wallet.connect(owner1).approveTransaction(0);
      await wallet.connect(owner2).approveTransaction(0);

      await expect(wallet.connect(owner1).executeTransaction(0))
        .to.emit(wallet, "Executed")
        .withArgs(0, owner1.address);
    });

    it("Should revert with fewer than M approvals", async function () {
      const { wallet, owner1, recipient } =
        await loadFixture(deployWalletFixture);

      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, ethers.parseEther("1"), "0x");
      await wallet.connect(owner1).approveTransaction(0);

      // Only 1 of 2 required
      await expect(
        wallet.connect(owner1).executeTransaction(0)
      ).to.be.revertedWithCustomError(wallet, "InsufficientApprovals");
    });

    it("Should revert when re-executing an already-executed transaction", async function () {
      const { wallet, owner1, owner2, recipient } =
        await loadFixture(deployWalletFixture);

      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, ethers.parseEther("1"), "0x");
      await wallet.connect(owner1).approveTransaction(0);
      await wallet.connect(owner2).approveTransaction(0);
      await wallet.connect(owner1).executeTransaction(0);

      await expect(
        wallet.connect(owner1).executeTransaction(0)
      ).to.be.revertedWithCustomError(wallet, "TransactionAlreadyExecuted");
    });

    it("Should revert when non-owner tries to execute", async function () {
      const { wallet, owner1, owner2, nonOwner, recipient } =
        await loadFixture(deployWalletFixture);

      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, ethers.parseEther("1"), "0x");
      await wallet.connect(owner1).approveTransaction(0);
      await wallet.connect(owner2).approveTransaction(0);

      await expect(
        wallet.connect(nonOwner).executeTransaction(0)
      ).to.be.revertedWithCustomError(wallet, "NotOwner");
    });

    it("Should revert when executing a non-existent transaction", async function () {
      const { wallet, owner1 } = await loadFixture(deployWalletFixture);

      await expect(
        wallet.connect(owner1).executeTransaction(999)
      ).to.be.revertedWithCustomError(wallet, "TransactionDoesNotExist");
    });
  });

  // ──────────────────────────────────────────────────────────
  //  Calldata Execution Test (Instructor Tip)
  // ──────────────────────────────────────────────────────────

  describe("Calldata Execution", function () {
    it("Should execute encoded calldata on target contract (SimpleCounter)", async function () {
      const { wallet, counter, owner1, owner2 } =
        await loadFixture(deployWalletFixture);

      // Encode increment() calldata
      const calldata = counter.interface.encodeFunctionData("increment");

      // Submit tx through multi-sig targeting SimpleCounter
      await wallet
        .connect(owner1)
        .submitTransaction(counter.target, 0, calldata);
      await wallet.connect(owner1).approveTransaction(0);
      await wallet.connect(owner2).approveTransaction(0);

      // Execute
      await wallet.connect(owner1).executeTransaction(0);

      // Verify counter was incremented
      expect(await counter.getCount()).to.equal(1);
    });

    it("Should execute multiple calldata transactions sequentially", async function () {
      const { wallet, counter, owner1, owner2 } =
        await loadFixture(deployWalletFixture);

      const calldata = counter.interface.encodeFunctionData("increment");

      // Submit and execute 3 increments
      for (let i = 0; i < 3; i++) {
        await wallet
          .connect(owner1)
          .submitTransaction(counter.target, 0, calldata);
        await wallet.connect(owner1).approveTransaction(i);
        await wallet.connect(owner2).approveTransaction(i);
        await wallet.connect(owner1).executeTransaction(i);
      }

      expect(await counter.getCount()).to.equal(3);
    });
  });

  // ──────────────────────────────────────────────────────────
  //  ETH Receipt & Send Tests
  // ──────────────────────────────────────────────────────────

  describe("ETH Handling", function () {
    it("Should receive ETH via receive() and emit Deposit", async function () {
      const { wallet, owner1 } = await loadFixture(deployWalletFixture);

      const depositAmount = ethers.parseEther("5");

      await expect(
        owner1.sendTransaction({
          to: wallet.target,
          value: depositAmount,
        })
      )
        .to.emit(wallet, "Deposit")
        .withArgs(owner1.address, depositAmount);
    });

    it("Should hold correct ETH balance", async function () {
      const { wallet } = await loadFixture(deployWalletFixture);

      // Fixture already sent 10 ETH
      const balance = await ethers.provider.getBalance(wallet.target);
      expect(balance).to.equal(ethers.parseEther("10"));
    });

    it("Should send ETH to recipient via executed transaction", async function () {
      const { wallet, owner1, owner2, recipient } =
        await loadFixture(deployWalletFixture);

      const sendAmount = ethers.parseEther("3");
      const recipientBalanceBefore = await ethers.provider.getBalance(
        recipient.address
      );

      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, sendAmount, "0x");
      await wallet.connect(owner1).approveTransaction(0);
      await wallet.connect(owner2).approveTransaction(0);
      await wallet.connect(owner1).executeTransaction(0);

      const recipientBalanceAfter = await ethers.provider.getBalance(
        recipient.address
      );
      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(
        sendAmount
      );
    });
  });

  // ──────────────────────────────────────────────────────────
  //  Full Happy Path (End-to-End)
  // ──────────────────────────────────────────────────────────

  describe("Full Happy Path", function () {
    it("submit → M owners approve → execute → verify target state change", async function () {
      const { wallet, counter, owner1, owner2, owner3 } =
        await loadFixture(deployWalletFixture);

      const calldata = counter.interface.encodeFunctionData("increment");

      // Step 1: Submit
      await wallet
        .connect(owner1)
        .submitTransaction(counter.target, 0, calldata);
      expect(await wallet.getTransactionCount()).to.equal(1);

      // Step 2: First approval
      await wallet.connect(owner2).approveTransaction(0);
      let [, , , approvalCount, executed] = await wallet.getTransaction(0);
      expect(approvalCount).to.equal(1);
      expect(executed).to.be.false;

      // Step 3: Second approval (meets threshold)
      await wallet.connect(owner3).approveTransaction(0);
      [, , , approvalCount] = await wallet.getTransaction(0);
      expect(approvalCount).to.equal(2);

      // Step 4: Execute
      await wallet.connect(owner1).executeTransaction(0);
      [, , , , executed] = await wallet.getTransaction(0);
      expect(executed).to.be.true;

      // Step 5: Verify state change on target
      expect(await counter.getCount()).to.equal(1);

      // Step 6: Verify approvers
      const approvers = await wallet.getApprovers(0);
      expect(approvers.length).to.equal(2);
      expect(approvers).to.include(owner2.address);
      expect(approvers).to.include(owner3.address);
    });
  });

  // ──────────────────────────────────────────────────────────
  //  View Function Tests
  // ──────────────────────────────────────────────────────────

  describe("View Functions", function () {
    it("getTransaction should return correct data", async function () {
      const { wallet, owner1, recipient } =
        await loadFixture(deployWalletFixture);

      const value = ethers.parseEther("2");
      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, value, "0xdead");

      const [to, val, data, approvalCount, executed] =
        await wallet.getTransaction(0);
      expect(to).to.equal(recipient.address);
      expect(val).to.equal(value);
      expect(data).to.equal("0xdead");
      expect(approvalCount).to.equal(0);
      expect(executed).to.be.false;
    });

    it("getApprovers should return list of approving addresses", async function () {
      const { wallet, owner1, owner2, owner3, recipient } =
        await loadFixture(deployWalletFixture);

      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, 0, "0x");
      await wallet.connect(owner1).approveTransaction(0);
      await wallet.connect(owner3).approveTransaction(0);

      const approvers = await wallet.getApprovers(0);
      expect(approvers.length).to.equal(2);
      expect(approvers[0]).to.equal(owner1.address);
      expect(approvers[1]).to.equal(owner3.address);
    });

    it("getTransactionCount should return correct count", async function () {
      const { wallet, owner1, recipient } =
        await loadFixture(deployWalletFixture);

      expect(await wallet.getTransactionCount()).to.equal(0);

      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, 0, "0x");
      expect(await wallet.getTransactionCount()).to.equal(1);

      await wallet
        .connect(owner1)
        .submitTransaction(recipient.address, 0, "0x");
      expect(await wallet.getTransactionCount()).to.equal(2);
    });

    it("getOwners should return all owners", async function () {
      const { wallet, owners } = await loadFixture(deployWalletFixture);

      const contractOwners = await wallet.getOwners();
      expect(contractOwners.length).to.equal(3);
      for (let i = 0; i < owners.length; i++) {
        expect(contractOwners[i]).to.equal(owners[i]);
      }
    });

    it("getTransaction should revert for non-existent txId", async function () {
      const { wallet } = await loadFixture(deployWalletFixture);

      await expect(wallet.getTransaction(0)).to.be.revertedWithCustomError(
        wallet,
        "TransactionDoesNotExist"
      );
    });
  });

  // ──────────────────────────────────────────────────────────
  //  Reentrancy Guard Test
  // ──────────────────────────────────────────────────────────

  describe("Reentrancy Protection", function () {
    it("Should be protected against reentrancy attacks via ReentrancyGuard", async function () {
      const { wallet, owner1, owner2 } =
        await loadFixture(deployWalletFixture);

      // Deploy attacker contract
      const Attacker = await ethers.getContractFactory("ReentrancyAttacker");
      const attacker = await Attacker.deploy(wallet.target);

      // Submit a transaction that sends ETH to the attacker
      await wallet
        .connect(owner1)
        .submitTransaction(
          attacker.target,
          ethers.parseEther("1"),
          "0x"
        );

      // Set the attacker's target txId
      await attacker.setTarget(0);

      // Approve
      await wallet.connect(owner1).approveTransaction(0);
      await wallet.connect(owner2).approveTransaction(0);

      // Execute — the attacker's receive() will try to re-enter but should fail
      // The execution itself should succeed (attacker's reentrancy attempt caught silently)
      await wallet.connect(owner1).executeTransaction(0);

      // Verify: attacker only received ETH once
      const attackerBalance = await ethers.provider.getBalance(attacker.target);
      expect(attackerBalance).to.equal(ethers.parseEther("1"));

      // Verify: the transaction is marked as executed
      const [, , , , executed] = await wallet.getTransaction(0);
      expect(executed).to.be.true;
    });
  });
});
