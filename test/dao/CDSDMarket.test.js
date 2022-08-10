const { accounts, contract } = require("@openzeppelin/test-environment");

const { BN, expectRevert, expectEvent } = require("@openzeppelin/test-helpers");
const { expect } = require("chai");

const MockCDOGEDOLAMarket = contract.fromArtifact("MockCDOGEDOLAMarket");
const Dollar = contract.fromArtifact("Dollar");
const ContractionDollar = contract.fromArtifact("ContractionDollar");

describe("CDOGEDOLAMarket", function () {
  const [ownerAddress, userAddress, poolAddress, userAddress1, userAddress2] = accounts;
  const initialUserDOGEDOLABalance = new BN(1000000);

  beforeEach(async function () {
    this.market = await MockCDOGEDOLAMarket.new(poolAddress, {
      from: ownerAddress,
      gas: 8000000,
    });
    this.dollar = await Dollar.at(await this.market.dollar());
    this.cdogedola = await ContractionDollar.at(await this.market.cdogedola());

    await this.market.incrementEpochE();
    await this.market.mintToE(userAddress, initialUserDOGEDOLABalance);
    await this.dollar.approve(this.market.address, initialUserDOGEDOLABalance, {
      from: userAddress,
    });
  });

  describe("burnDOGEDOLAForCDOGEDOLA", function () {
    describe("when price is above 1", function () {
      it("reverts", async function () {
        await this.market.justMintCDOGEDOLAToE(userAddress, 1000, {
          from: ownerAddress,
        });

        await this.market.setPriceE(110, 100);

        await expectRevert(
          this.market.burnDOGEDOLAForCDOGEDOLA(new BN(1000), { from: userAddress }),
          "Market: not in contraction",
        );
      });
    });

    describe("when burning DOGEDOLA", function () {
      beforeEach(async function () {
        await this.market.mintToE(userAddress, 1000); // added to initial balance
        await this.dollar.approve(this.market.address, 1000, {
          from: userAddress,
        });

        await this.market.setPriceE(91, 100);

        this.result = await this.market.burnDOGEDOLAForCDOGEDOLA(1000, {
          from: userAddress,
        });
        this.txHash = this.result.tx;
      });

      it("updates users balances", async function () {
        expect(await this.dollar.balanceOf(userAddress)).to.be.bignumber.equal(initialUserDOGEDOLABalance); // after burning only the initial balance remains
        expect(await this.cdogedola.balanceOf(userAddress)).to.be.bignumber.equal(new BN(1000));
        expect(await this.market.depositedCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(0)); // user has not deposited

        expect(await this.market.earnableCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(1000));
      });

      it("updates dao balances", async function () {
        expect(await this.dollar.balanceOf(this.market.address)).to.be.bignumber.equal(new BN(0));

        expect(await this.cdogedola.balanceOf(this.market.address)).to.be.bignumber.equal(new BN(0));

        expect(await this.market.totalCDOGEDOLADeposited()).to.be.bignumber.equal(new BN(0));
        expect(await this.market.totalCDOGEDOLAEarnable()).to.be.bignumber.equal(new BN(1000));
      });

      it("emits CDOGEDOLAMinted event", async function () {
        const event = await expectEvent.inTransaction(this.txHash, MockCDOGEDOLAMarket, "CDOGEDOLAMinted", {
          account: userAddress,
        });

        expect(event.args.account).to.be.bignumber.equal(userAddress);
        expect(event.args.amount).to.be.bignumber.equal(new BN(1000));
      });
    });
  });

  describe("migrateCouponsToCDOGEDOLA", function () {
    describe("when burning coupons", function () {
      beforeEach(async function () {
        const couponEpoch = 1;

        await this.market.incrementBalanceOfCouponsE(userAddress, couponEpoch, 1000);
        await this.market.incrementBalanceOfCouponUnderlyingE(userAddress, couponEpoch, 1000);

        // await this.market.setPriceE(91, 100);

        this.result = await this.market.migrateCouponsToCDOGEDOLA(couponEpoch, {
          from: userAddress,
        });
        this.txHash = this.result.tx;
      });

      it("updates users balances", async function () {
        expect(await this.cdogedola.balanceOf(userAddress)).to.be.bignumber.equal(new BN(2000));
        expect(await this.market.balanceOfCoupons(userAddress, 1)).to.be.bignumber.equal(new BN(0));
        expect(await this.market.balanceOfCouponUnderlying(userAddress, 1)).to.be.bignumber.equal(new BN(0));
        expect(await this.market.depositedCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(0)); // user has not deposited/bonded
        expect(await this.market.earnableCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(0));
      });

      it("updates dao balances", async function () {
        expect(await this.dollar.balanceOf(this.market.address)).to.be.bignumber.equal(new BN(0));

        expect(await this.cdogedola.balanceOf(this.market.address)).to.be.bignumber.equal(new BN(0));

        expect(await this.market.totalCoupons()).to.be.bignumber.equal(new BN(0));

        expect(await this.market.totalCouponUnderlying()).to.be.bignumber.equal(new BN(0));

        expect(await this.market.totalCDOGEDOLADeposited()).to.be.bignumber.equal(new BN(0));

        expect(await this.market.totalCDOGEDOLAEarnable()).to.be.bignumber.equal(new BN(0));
      });

      it("emits CDOGEDOLAMinted event", async function () {
        const event = await expectEvent.inTransaction(this.txHash, MockCDOGEDOLAMarket, "CDOGEDOLAMinted", {
          account: userAddress,
        });

        expect(event.args.account).to.be.bignumber.equal(userAddress);
        expect(event.args.amount).to.be.bignumber.equal(new BN(2000));
      });
    });
  });

  describe("burnDOGEDOLAForCDOGEDOLAAndBond", function () {
    describe("when burning DOGEDOLA plus bonding cDOGEDOLA", function () {
      beforeEach(async function () {
        await this.market.mintToE(userAddress, 1000); // added to initial balance
        await this.dollar.approve(this.market.address, 1000, {
          from: userAddress,
        });

        this.result = await this.market.burnDOGEDOLAForCDOGEDOLAAndBond(1000, {
          from: userAddress,
        });
        this.txHash = this.result.tx;
      });

      it("updates users balances", async function () {
        expect(await this.dollar.balanceOf(userAddress)).to.be.bignumber.equal(initialUserDOGEDOLABalance); // after burning only the initial balance remains
        expect(await this.cdogedola.balanceOf(userAddress)).to.be.bignumber.equal(new BN(0));
        expect(await this.market.depositedCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(1000)); // user shares of bonded cDOGEDOLA
        expect(await this.market.earnableCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(1000));
      });

      it("updates dao balances", async function () {
        expect(await this.dollar.balanceOf(this.market.address)).to.be.bignumber.equal(new BN(0));

        expect(await this.cdogedola.balanceOf(this.market.address)).to.be.bignumber.equal(new BN(1000));

        expect(await this.market.totalCDOGEDOLADeposited()).to.be.bignumber.equal(new BN(1000));
        expect(await this.market.totalCDOGEDOLAEarnable()).to.be.bignumber.equal(new BN(1000));
      });

      it("emits CDOGEDOLAMinted event", async function () {
        const event = await expectEvent.inTransaction(this.txHash, MockCDOGEDOLAMarket, "CDOGEDOLAMinted", {
          account: userAddress,
        });

        expect(event.args.account).to.be.bignumber.equal(userAddress);
        expect(event.args.amount).to.be.bignumber.equal(new BN(1000));
      });

      it("emits BondCDOGEDOLA event", async function () {
        const event = await expectEvent.inTransaction(this.txHash, MockCDOGEDOLAMarket, "BondCDOGEDOLA", {
          account: userAddress,
        });

        expect(event.args.account).to.be.bignumber.equal(userAddress);
        expect(event.args.start).to.be.bignumber.equal(new BN(2));
        expect(event.args.amount).to.be.bignumber.equal(new BN(1000));
      });
    });
  });

  describe("migrateCouponsToCDOGEDOLAAndBond", function () {
    describe("when burning coupons plus bonding cDOGEDOLA", function () {
      beforeEach(async function () {
        const couponEpoch = 1;

        await this.market.incrementBalanceOfCouponsE(userAddress, couponEpoch, 1000);
        await this.market.incrementBalanceOfCouponUnderlyingE(userAddress, couponEpoch, 1000);

        this.result = await this.market.migrateCouponsToCDOGEDOLAAndBond(couponEpoch, {
          from: userAddress,
        });
        this.txHash = this.result.tx;
      });

      it("updates users balances", async function () {
        expect(await this.cdogedola.balanceOf(userAddress)).to.be.bignumber.equal(new BN(0));
        expect(await this.market.balanceOfCoupons(userAddress, 1)).to.be.bignumber.equal(new BN(0));
        expect(await this.market.balanceOfCouponUnderlying(userAddress, 1)).to.be.bignumber.equal(new BN(0));
        expect(await this.market.depositedCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(2000)); // user  shares of bonded cDOGEDOLA
        expect(await this.market.earnableCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(0));
      });

      it("updates dao balances", async function () {
        expect(await this.dollar.balanceOf(this.market.address)).to.be.bignumber.equal(new BN(0));

        expect(await this.cdogedola.balanceOf(this.market.address)).to.be.bignumber.equal(new BN(2000));

        expect(await this.market.totalCoupons()).to.be.bignumber.equal(new BN(0));

        expect(await this.market.totalCouponUnderlying()).to.be.bignumber.equal(new BN(0));

        expect(await this.market.totalCDOGEDOLADeposited()).to.be.bignumber.equal(new BN(2000));
        expect(await this.market.totalCDOGEDOLAEarnable()).to.be.bignumber.equal(new BN(0));
      });

      it("emits CDOGEDOLAMinted event", async function () {
        const event = await expectEvent.inTransaction(this.txHash, MockCDOGEDOLAMarket, "CDOGEDOLAMinted", {
          account: userAddress,
        });

        expect(event.args.account).to.be.bignumber.equal(userAddress);
        expect(event.args.amount).to.be.bignumber.equal(new BN(2000));
      });

      it("emits BondCDOGEDOLA event", async function () {
        const event = await expectEvent.inTransaction(this.txHash, MockCDOGEDOLAMarket, "BondCDOGEDOLA", {
          account: userAddress,
        });

        expect(event.args.account).to.be.bignumber.equal(userAddress);
        expect(event.args.start).to.be.bignumber.equal(new BN(2));
        expect(event.args.amount).to.be.bignumber.equal(new BN(2000));
      });
    });
  });

  describe("bondCDOGEDOLA", function () {
    describe("calls that reverts", function () {
      beforeEach(async function () {
        await this.market.mintCDOGEDOLAAndIncreaseDOGEDOLABurnedE(userAddress, 1000, {
          from: userAddress,
        });

        await this.market.incrementEpochE({ from: userAddress });
      });

      it("cannot have no amount", async function () {
        await expectRevert(
          this.market.bondCDOGEDOLA(new BN(0), { from: userAddress }),
          "Market: bound must be greater than 0",
        );
      });
    });

    describe("when user simply bonds cDOGEDOLA", function () {
      beforeEach(async function () {
        await this.market.mintCDOGEDOLAAndIncreaseDOGEDOLABurnedE(userAddress, 1000, {
          from: userAddress,
        });

        this.result = await this.market.bondCDOGEDOLA(1000, {
          from: userAddress,
        });
        this.txHash = this.result.tx;
      });

      it("updates users balances", async function () {
        expect(await this.cdogedola.balanceOf(userAddress)).to.be.bignumber.equal(new BN(0));
        expect(await this.market.depositedCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(1000)); // user bonded cDOGEDOLA
        expect(await this.market.earnableCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(1000));
      });

      it("updates dao balances", async function () {
        expect(await this.dollar.balanceOf(this.market.address)).to.be.bignumber.equal(new BN(0));

        expect(await this.cdogedola.balanceOf(this.market.address)).to.be.bignumber.equal(new BN(1000));

        expect(await this.market.totalCDOGEDOLADeposited()).to.be.bignumber.equal(new BN(1000));
        expect(await this.market.totalCDOGEDOLAEarnable()).to.be.bignumber.equal(new BN(1000));
      });

      it("emits BondCDOGEDOLA event", async function () {
        const event = await expectEvent.inTransaction(this.txHash, MockCDOGEDOLAMarket, "BondCDOGEDOLA", {
          account: userAddress,
        });

        expect(event.args.account).to.be.bignumber.equal(userAddress);
        expect(event.args.start).to.be.bignumber.equal(new BN(2));
        expect(event.args.amount).to.be.bignumber.equal(new BN(1000));
      });
    });

    describe("when user partially bonds", function () {
      beforeEach(async function () {
        await this.market.mintCDOGEDOLAAndIncreaseDOGEDOLABurnedE(userAddress, 1000, {
          from: userAddress,
        });

        this.result = await this.market.bondCDOGEDOLA(300, {
          from: userAddress,
        });
        this.txHash = this.result.tx;
      });

      it("updates users balances", async function () {
        expect(await this.cdogedola.balanceOf(userAddress)).to.be.bignumber.equal(new BN(700));
        expect(await this.market.depositedCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(300)); // user bonded cDOGEDOLA
        expect(await this.market.earnableCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(1000));
      });

      it("updates dao balances", async function () {
        expect(await this.cdogedola.balanceOf(this.market.address)).to.be.bignumber.equal(new BN(300));
        expect(await this.market.totalCDOGEDOLADeposited()).to.be.bignumber.equal(new BN(300));
        expect(await this.market.totalCDOGEDOLAEarnable()).to.be.bignumber.equal(new BN(1000));
      });

      it("emits BondCDOGEDOLA event", async function () {
        const event = await expectEvent.inTransaction(this.txHash, MockCDOGEDOLAMarket, "BondCDOGEDOLA", {
          account: userAddress,
        });

        expect(event.args.account).to.be.bignumber.equal(userAddress);
        expect(event.args.start).to.be.bignumber.equal(new BN(2));
        expect(event.args.amount).to.be.bignumber.equal(new BN(300));
      });
    });

    describe("multiple users bond their cDOGEDOLA", function () {
      beforeEach(async function () {
        await this.market.mintCDOGEDOLAAndIncreaseDOGEDOLABurnedE(userAddress1, 1000);
        await this.market.mintCDOGEDOLAAndIncreaseDOGEDOLABurnedE(userAddress2, 1000);

        await this.market.bondCDOGEDOLA(600, { from: userAddress1 });

        await this.market.bondCDOGEDOLA(400, { from: userAddress2 });

        await this.market.incrementEpochE({ from: userAddress });

        await this.market.mintCDOGEDOLAAndIncreaseDOGEDOLABurnedE(this.market.address, 1000);

        await this.market.mintCDOGEDOLAAndIncreaseDOGEDOLABurnedE(userAddress, 1000);
        this.result = await this.market.bondCDOGEDOLA(500, {
          from: userAddress,
        });

        this.txHash = this.result.tx;
      });

      it("updates users balances", async function () {
        expect(await this.dollar.balanceOf(userAddress)).to.be.bignumber.equal(new BN(initialUserDOGEDOLABalance));

        expect(await this.cdogedola.balanceOf(userAddress)).to.be.bignumber.equal(
          new BN(500), // total of shares
        );

        expect(await this.market.depositedCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(500)); // user shares of bonded cDOGEDOLA
        expect(await this.market.earnableCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(1000));
      });

      it("updates dao balances", async function () {
        expect(await this.cdogedola.balanceOf(this.market.address)).to.be.bignumber.equal(
          new BN(600).add(new BN(400)).add(new BN(1000)).add(new BN(500)),
        );

        expect(await this.market.totalCDOGEDOLADeposited()).to.be.bignumber.equal(new BN(1500));
        expect(await this.market.totalCDOGEDOLAEarnable()).to.be.bignumber.equal(new BN(4000));
      });

      it("emits BondCDOGEDOLA event", async function () {
        const event = await expectEvent.inTransaction(this.txHash, MockCDOGEDOLAMarket, "BondCDOGEDOLA", {
          account: userAddress,
        });

        expect(event.args.account).to.be.bignumber.equal(userAddress);
        expect(event.args.start).to.be.bignumber.equal(new BN(3));
        expect(event.args.amount).to.be.bignumber.equal(new BN(500));
      });
    });
  });

  describe("unbondCDOGEDOLA", function () {
    describe("calls that reverts", function () {
      describe("when nothing bonded", function () {
        it("reverts", async function () {
          await this.market.mintCDOGEDOLAAndIncreaseDOGEDOLABurnedE(userAddress, 1000, {
            from: userAddress,
          });

          await expectRevert(this.market.unbondCDOGEDOLA(new BN(1000), { from: userAddress }), "Market: amounts > 0!");
        });
      });

      describe("when bonded", function () {
        beforeEach(async function () {
          await this.market.mintCDOGEDOLAAndIncreaseDOGEDOLABurnedE(userAddress, 1000, {
            from: userAddress,
          });

          await this.market.bondCDOGEDOLA(1000, {
            from: userAddress,
          });

          await this.market.incrementEpochE({ from: userAddress });
        });

        it("cannot unbound more amount than owned", async function () {
          await expectRevert(
            this.market.unbondCDOGEDOLA(new BN(1500), { from: userAddress }),
            "Market: insufficient amount to unbound",
          );
        });

        it("cannot have no amount", async function () {
          await expectRevert(this.market.unbondCDOGEDOLA(new BN(0), { from: userAddress }), "Market: amounts > 0!");
        });
      });
    });

    describe("when unbonding cdogedola", function () {
      beforeEach(async function () {
        await this.market.mintCDOGEDOLAAndIncreaseDOGEDOLABurnedE(userAddress, 1000, {
          from: userAddress,
        });

        await this.market.bondCDOGEDOLA(1000, {
          from: userAddress,
        });

        await this.market.incrementEpochE({ from: userAddress });
      });

      describe("simple", function () {
        beforeEach(async function () {
          this.result = await this.market.unbondCDOGEDOLA(new BN(1000), { from: userAddress });
          this.txHash = this.result.tx;
        });

        it("updates users balances", async function () {
          expect(await this.cdogedola.balanceOf(userAddress)).to.be.bignumber.equal(new BN(1000));
          expect(await this.market.depositedCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(0));

          expect(await this.market.earnableCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(1000));
        });

        it("updates dao balances", async function () {
          expect(await this.cdogedola.balanceOf(this.market.address)).to.be.bignumber.equal(new BN(0));
          expect(await this.market.totalCDOGEDOLADeposited()).to.be.bignumber.equal(new BN(0));
          expect(await this.market.totalCDOGEDOLAEarnable()).to.be.bignumber.equal(new BN(1000));
        });

        it("emits UnbondCDOGEDOLA event", async function () {
          const event = await expectEvent.inTransaction(this.txHash, MockCDOGEDOLAMarket, "UnbondCDOGEDOLA", {
            account: userAddress,
          });

          expect(event.args.account).to.be.bignumber.equal(userAddress);
          expect(event.args.start).to.be.bignumber.equal(new BN(3));
          expect(event.args.amount).to.be.bignumber.equal(new BN(1000));
        });
      });

      describe("partially unbounding", function () {
        beforeEach(async function () {
          this.result = await this.market.unbondCDOGEDOLA(new BN(800), { from: userAddress });
          this.txHash = this.result.tx;
        });

        it("updates users balances", async function () {
          expect(await this.cdogedola.balanceOf(userAddress)).to.be.bignumber.equal(new BN(800));
          expect(await this.market.depositedCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(200));

          expect(await this.market.earnableCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(1000));
        });

        it("updates dao balances", async function () {
          expect(await this.cdogedola.balanceOf(this.market.address)).to.be.bignumber.equal(new BN(200));
          expect(await this.market.totalCDOGEDOLADeposited()).to.be.bignumber.equal(new BN(200));
          expect(await this.market.totalCDOGEDOLAEarnable()).to.be.bignumber.equal(new BN(1000));
        });

        it("emits UnbondCDOGEDOLA event", async function () {
          const event = await expectEvent.inTransaction(this.txHash, MockCDOGEDOLAMarket, "UnbondCDOGEDOLA", {
            account: userAddress,
          });

          expect(event.args.account).to.be.bignumber.equal(userAddress);
          expect(event.args.start).to.be.bignumber.equal(new BN(3));
          expect(event.args.amount).to.be.bignumber.equal(new BN(800));
        });
      });

      describe("multiple", function () {
        beforeEach(async function () {
          await this.market.mintCDOGEDOLAAndIncreaseDOGEDOLABurnedE(userAddress1, 1000);
          await this.market.mintCDOGEDOLAAndIncreaseDOGEDOLABurnedE(userAddress2, 1000);

          await this.market.bondCDOGEDOLA(600, { from: userAddress1 });
          await this.market.bondCDOGEDOLA(400, { from: userAddress2 });

          await this.market.incrementEpochE({ from: userAddress });

          this.result = await this.market.unbondCDOGEDOLA(800, {
            from: userAddress,
          });

          this.txHash = this.result.tx;
        });

        it("updates users balances", async function () {
          expect(await this.cdogedola.balanceOf(userAddress)).to.be.bignumber.equal(new BN(800));
          expect(await this.market.depositedCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(200)); // user shares of bonded cDOGEDOLA

          expect(await this.market.earnableCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(1000));
        });

        it("updates dao balances", async function () {
          expect(await this.cdogedola.balanceOf(this.market.address)).to.be.bignumber.equal(
            new BN(600).add(new BN(400)).add(new BN(1000)).sub(new BN(800)), // 800 shares was removed which equals 1200 cDOGEDOLA
          );
          expect(await this.market.totalCDOGEDOLADeposited()).to.be.bignumber.equal(new BN(1200));
          expect(await this.market.totalCDOGEDOLAEarnable()).to.be.bignumber.equal(new BN(3000));
        });

        it("emits UnbondCDOGEDOLA event", async function () {
          const event = await expectEvent.inTransaction(this.txHash, MockCDOGEDOLAMarket, "UnbondCDOGEDOLA", {
            account: userAddress,
          });

          expect(event.args.account).to.be.bignumber.equal(userAddress);
          expect(event.args.start).to.be.bignumber.equal(new BN(4));
          expect(event.args.amount).to.be.bignumber.equal(new BN(800));
        });
      });
    });
  });

  describe("redeemBondedCDOGEDOLAForDOGEDOLA", function () {
    describe("calls that reverts", function () {
      describe("when price is under 1", function () {
        it("reverts", async function () {
          await this.market.mintCDOGEDOLAAndIncreaseDOGEDOLABurnedE(userAddress, 1000, {
            from: userAddress,
          });

          await this.market.setPriceE(91, 100);

          await expectRevert(
            this.market.redeemBondedCDOGEDOLAForDOGEDOLA(new BN(1000), { from: userAddress }),
            "Market: not in expansion",
          );
        });
      });

      describe("when price is above 1", function () {
        beforeEach(async function () {
          await this.market.mintCDOGEDOLAAndIncreaseDOGEDOLABurnedE(userAddress, 1000, {
            from: userAddress,
          });

          await this.market.mintCDOGEDOLAAndIncreaseDOGEDOLABurnedE(userAddress1, 2000, {
            from: userAddress,
          });

          await this.market.bondCDOGEDOLA(1000, {
            from: userAddress,
          });
          await this.market.bondCDOGEDOLA(2000, {
            from: userAddress1,
          });

          await this.market.setPriceE(111, 100);

          await this.market.incrementEpochE({ from: userAddress });
        });

        it("cannot redeem more amount than earnable", async function () {
          await expectRevert(
            this.market.redeemBondedCDOGEDOLAForDOGEDOLA(new BN(2500), { from: userAddress }),
            "Market: not enough redeemable",
          );
        });

        it("cannot redeem more amount than owned", async function () {
          await expectRevert(
            this.market.redeemBondedCDOGEDOLAForDOGEDOLA(new BN(1500), { from: userAddress }),
            "Market: not enough redeemable",
          );
        });

        it("reverts when amount is zero", async function () {
          await expectRevert(
            this.market.redeemBondedCDOGEDOLAForDOGEDOLA(new BN(0), { from: userAddress }),
            "Market: amounts > 0!",
          );
        });

        it("is unable to remove more than redeemable limit", async function () {
          await expectRevert(
            this.market.redeemBondedCDOGEDOLAForDOGEDOLA(new BN(33), { from: userAddress }), // needs to be 32 or lower
            "Market: not enough redeemable",
          );
        });
      });
    });

    describe("when redeeming cdogedola for DOGEDOLA", function () {
      beforeEach(async function () {
        await this.market.mintCDOGEDOLAAndIncreaseDOGEDOLABurnedE(userAddress, 1000, {
          from: userAddress,
        });

        await this.market.bondCDOGEDOLA(1000, {
          from: userAddress,
        });

        await this.market.setPriceE(111, 100);

        await this.market.incrementEpochE({ from: userAddress });
      });

      describe("partially redeeming", function () {
        beforeEach(async function () {
          await this.market.incrementTotalCDOGEDOLARedeemableE(200);

          this.balanceBeforeRedeem = await this.dollar.balanceOf(userAddress);
          this.result = await this.market.redeemBondedCDOGEDOLAForDOGEDOLA(new BN(10), { from: userAddress });
          this.txHash = this.result.tx;
        });

        it("updates users balances", async function () {
          expect(await this.cdogedola.balanceOf(userAddress)).to.be.bignumber.equal(new BN(0));
          expect(await this.dollar.balanceOf(userAddress)).to.be.bignumber.equal(
            this.balanceBeforeRedeem.add(new BN(10)),
          ); // + 10 DOGEDOLA after redeemption
          expect(await this.market.depositedCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(990));
          expect(await this.market.earnableCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(1000));
        });

        it("updates dao balances", async function () {
          expect(await this.cdogedola.balanceOf(this.market.address)).to.be.bignumber.equal(new BN(990));
          expect(await this.market.totalCDOGEDOLADeposited()).to.be.bignumber.equal(new BN(990));
          expect(await this.market.totalCDOGEDOLAEarnable()).to.be.bignumber.equal(new BN(1000));
        });

        it("emits CDOGEDOLARedeemed event", async function () {
          const event = await expectEvent.inTransaction(this.txHash, MockCDOGEDOLAMarket, "CDOGEDOLARedeemed", {
            account: userAddress,
          });

          expect(event.args.account).to.be.bignumber.equal(userAddress);
          expect(event.args.amount).to.be.bignumber.equal(new BN(10));
        });
      });

      describe("redeeming all", function () {
        beforeEach(async function () {
          const totalEarnable = await this.market.totalCDOGEDOLAEarnable();
          await this.market.incrementTotalCDOGEDOLARedeemableE(totalEarnable);

          this.result = await this.market.redeemBondedCDOGEDOLAForDOGEDOLA(999, { from: userAddress });
          this.txHash = this.result.tx;
        });

        it("updates users balances", async function () {
          expect(await this.cdogedola.balanceOf(userAddress)).to.be.bignumber.equal(new BN(0));
          expect(await this.market.depositedCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(1));
          expect(await this.market.earnableCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(1000));
        });

        it("updates dao balances", async function () {
          expect(await this.cdogedola.balanceOf(this.market.address)).to.be.bignumber.equal(new BN(1));
          expect(await this.market.totalCDOGEDOLADeposited()).to.be.bignumber.equal(new BN(1));

          expect(await this.market.totalCDOGEDOLAEarnable()).to.be.bignumber.equal(new BN(1000));
        });

        it("emits CDOGEDOLARedeemed event", async function () {
          const event = await expectEvent.inTransaction(this.txHash, MockCDOGEDOLAMarket, "CDOGEDOLARedeemed", {
            account: userAddress,
          });

          expect(event.args.account).to.be.bignumber.equal(userAddress);
          expect(event.args.amount).to.be.bignumber.equal(new BN(999));
        });
      });

      describe("multiple", function () {
        beforeEach(async function () {
          await this.market.mintCDOGEDOLAAndIncreaseDOGEDOLABurnedE(userAddress1, 1000);
          await this.market.mintCDOGEDOLAAndIncreaseDOGEDOLABurnedE(userAddress2, 1000);

          await this.market.bondCDOGEDOLA(600, { from: userAddress1 });
          await this.market.bondCDOGEDOLA(400, { from: userAddress2 });

          await this.market.incrementEpochE({ from: userAddress });

          await this.market.incrementTotalCDOGEDOLARedeemableE(2000);

          this.result = await this.market.redeemBondedCDOGEDOLAForDOGEDOLA(200, {
            from: userAddress,
          });

          this.txHash = this.result.tx;
        });

        it("updates users balances", async function () {
          expect(await this.cdogedola.balanceOf(userAddress)).to.be.bignumber.equal(new BN(0));
          expect(await this.market.depositedCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(800)); // user shares of bonded cDOGEDOLA

          expect(await this.market.earnableCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(1000));

          expect(await this.cdogedola.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(400));
          expect(await this.market.depositedCDOGEDOLAByAccount(userAddress1)).to.be.bignumber.equal(new BN(600)); // user shares of bonded cDOGEDOLA

          expect(await this.market.earnableCDOGEDOLAByAccount(userAddress1)).to.be.bignumber.equal(new BN(1000));

          expect(await this.cdogedola.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(600));
          expect(await this.market.depositedCDOGEDOLAByAccount(userAddress2)).to.be.bignumber.equal(new BN(400)); // user shares of bonded cDOGEDOLA

          expect(await this.market.earnableCDOGEDOLAByAccount(userAddress2)).to.be.bignumber.equal(new BN(1000));
        });

        it("updates dao balances", async function () {
          expect(await this.cdogedola.balanceOf(this.market.address)).to.be.bignumber.equal(
            new BN(600).add(new BN(400)).add(new BN(1000)).sub(new BN(200)),
          );
          expect(await this.market.totalCDOGEDOLADeposited()).to.be.bignumber.equal(new BN(1800));

          expect(await this.market.totalCDOGEDOLAEarnable()).to.be.bignumber.equal(new BN(3000));
        });

        it("emits CDOGEDOLARedeemed event", async function () {
          const event = await expectEvent.inTransaction(this.txHash, MockCDOGEDOLAMarket, "CDOGEDOLARedeemed", {
            account: userAddress,
          });

          expect(event.args.account).to.be.bignumber.equal(userAddress);
          expect(event.args.amount).to.be.bignumber.equal(new BN(200));
        });
      });
    });
  });
});
