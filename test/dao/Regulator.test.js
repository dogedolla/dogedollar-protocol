const { accounts, contract } = require("@openzeppelin/test-environment");

const { BN, expectEvent } = require("@openzeppelin/test-helpers");
const { expect } = require("chai");

const MockRegulator = contract.fromArtifact("MockRegulator");
const MockSettableOracle = contract.fromArtifact("MockSettableOracle");
const Dollar = contract.fromArtifact("Dollar");

const POOL_REWARD_PERCENT = 35;
const TREASURE_REWARD_PERCENT = 3;

function lessPoolAndTreasureIncentive(baseAmount, newAmount) {
  return new BN(baseAmount + newAmount - poolIncentive(newAmount) - treasureIncentive(newAmount));
}

function poolIncentive(newAmount) {
  return new BN((newAmount * POOL_REWARD_PERCENT) / 100);
}

function treasureIncentive(newAmount) {
  return new BN((newAmount * TREASURE_REWARD_PERCENT) / 100);
}

describe("Regulator", function () {
  const [ownerAddress, userAddress, poolAddress, userAddress1, userAddress2] = accounts;

  beforeEach(async function () {
    this.oracle = await MockSettableOracle.new({
      from: ownerAddress,
      gas: 8000000,
    });
    this.regulator = await MockRegulator.new(this.oracle.address, poolAddress, { from: ownerAddress, gas: 8000000 });
    this.dollar = await Dollar.at(await this.regulator.dollar());
    this.cdogedola = await Dollar.at(await this.regulator.cdogedola());
  });

  describe("after bootstrapped", function () {
    beforeEach(async function () {
      await this.regulator.incrementEpochE(); // 1
      await this.regulator.incrementEpochE(); // 2
      await this.regulator.incrementEpochE(); // 3
      await this.regulator.incrementEpochE(); // 4
      await this.regulator.incrementEpochE(); // 5
    });

    describe("up regulation", function () {
      describe("above limit", function () {
        beforeEach(async function () {
          await this.regulator.incrementEpochE(); // 1
          await this.regulator.incrementEpochE(); // 2
          await this.regulator.incrementTotalBondedE(1000000);
          await this.regulator.mintToE(this.regulator.address, 1000000);
        });

        describe("on step", function () {
          beforeEach(async function () {
            await this.oracle.set(115, 100, true);
            this.expectedReward = 6000;

            this.result = await this.regulator.stepE();
            this.txHash = this.result.tx;
          });

          it("mints new Dollar tokens", async function () {
            expect(await this.dollar.totalSupply()).to.be.bignumber.equal(
              new BN(1000000).add(new BN(this.expectedReward)),
            );
            expect(await this.dollar.balanceOf(this.regulator.address)).to.be.bignumber.equal(
              lessPoolAndTreasureIncentive(1000000, this.expectedReward),
            );
          });

          it("updates totals", async function () {
            expect(await this.regulator.totalStaged()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalBonded()).to.be.bignumber.equal(
              lessPoolAndTreasureIncentive(1000000, this.expectedReward),
            );
            expect(await this.regulator.totalDebt()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalSupply()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalCoupons()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalRedeemable()).to.be.bignumber.equal(new BN(0));
          });

          it("emits SupplyIncrease event", async function () {
            const event = await expectEvent.inTransaction(this.txHash, MockRegulator, "SupplyIncrease", {});

            expect(event.args.epoch).to.be.bignumber.equal(new BN(7));
            expect(event.args.price).to.be.bignumber.equal(new BN(115).mul(new BN(10).pow(new BN(16))));
            expect(event.args.newRedeemable).to.be.bignumber.equal(new BN(0));
            expect(event.args.newBonded).to.be.bignumber.equal(new BN(this.expectedReward));
          });
        });
      });

      describe("(2) - only to bonded DOGEDOLA", function () {
        beforeEach(async function () {
          await this.regulator.incrementEpochE(); // 1
          await this.regulator.incrementEpochE(); // 2
          await this.regulator.incrementTotalBondedE(1000000);
          await this.regulator.mintToE(this.regulator.address, 1000000);
        });

        describe("on step", function () {
          beforeEach(async function () {
            await this.oracle.set(101, 100, true);
            this.expectedReward = 400;

            this.result = await this.regulator.stepE();
            this.txHash = this.result.tx;
          });

          it("mints new Dollar tokens", async function () {
            expect(await this.dollar.totalSupply()).to.be.bignumber.equal(
              new BN(1000000).add(new BN(this.expectedReward)),
            );
            expect(await this.dollar.balanceOf(this.regulator.address)).to.be.bignumber.equal(
              lessPoolAndTreasureIncentive(1000000, this.expectedReward),
            );
          });

          it("updates totals", async function () {
            expect(await this.regulator.totalStaged()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalBonded()).to.be.bignumber.equal(
              lessPoolAndTreasureIncentive(1000000, this.expectedReward),
            );
            expect(await this.regulator.totalDebt()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalSupply()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalCoupons()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalRedeemable()).to.be.bignumber.equal(new BN(0));
          });

          it("emits SupplyIncrease event", async function () {
            const event = await expectEvent.inTransaction(this.txHash, MockRegulator, "SupplyIncrease", {});

            expect(event.args.epoch).to.be.bignumber.equal(new BN(7));
            expect(event.args.price).to.be.bignumber.equal(new BN(101).mul(new BN(10).pow(new BN(16))));
            expect(event.args.newRedeemable).to.be.bignumber.equal(new BN(0));
            expect(event.args.newBonded).to.be.bignumber.equal(new BN(this.expectedReward));
          });
        });
      });

      describe("(1) - bonded DOGEDOLA plus bonded CDOGEDOLA", function () {
        beforeEach(async function () {
          await this.regulator.incrementEpochE(); // 1

          await this.regulator.incrementTotalBondedE(1000000);
          await this.regulator.mintToE(this.regulator.address, 1000000);

          await this.regulator.mintToE(userAddress, new BN(100000));
          await this.dollar.approve(this.regulator.address, new BN(100000), { from: userAddress });

          await this.regulator.burnDOGEDOLAForCDOGEDOLAAndBond(new BN(100000), { from: userAddress });

          await this.regulator.incrementEpochE(); // 2
        });

        describe("on step", function () {
          beforeEach(async function () {
            await this.oracle.set(101, 100, true);
            this.expectedReward = 152;
            this.expectedRedeemableCDOGEDOLAForDOGEDOLA = 100000 * 2;
            this.expectedRewardTreasure = 12;

            this.result = await this.regulator.stepE();
            this.txHash = this.result.tx;
          });

          it("mints new Dollar tokens", async function () {
            expect(await this.dollar.totalSupply()).to.be.bignumber.equal(
              new BN(1000000).add(new BN(this.expectedReward)),
            );

            expect(await this.cdogedola.totalSupply()).to.be.bignumber.equal(
              new BN(100000), // no cDOGEDOLA was minted during expansion
            );
            expect(await this.dollar.balanceOf(this.regulator.address)).to.be.bignumber.equal(new BN(1000000));

            expect(await this.dollar.balanceOf(await this.regulator.treasuryE())).to.be.bignumber.equal(
              new BN(this.expectedRewardTreasure),
            );
          });

          it("updates totals", async function () {
            expect(await this.regulator.totalStaged()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalBonded()).to.be.bignumber.equal(new BN(1000000));

            expect(await this.regulator.totalCDOGEDOLARedeemable()).to.be.bignumber.equal(
              new BN(this.expectedRedeemableCDOGEDOLAForDOGEDOLA),
            );
          });

          it("emits SupplyIncrease event", async function () {
            const event = await expectEvent.inTransaction(this.txHash, MockRegulator, "SupplyIncrease", {});

            expect(event.args.epoch).to.be.bignumber.equal(new BN(7));
            expect(event.args.price).to.be.bignumber.equal(new BN(101).mul(new BN(10).pow(new BN(16))));
            expect(event.args.newRedeemable).to.be.bignumber.equal(new BN(this.expectedRedeemableCDOGEDOLAForDOGEDOLA));
            expect(event.args.newBonded).to.be.bignumber.equal(
              new BN(this.expectedReward + this.expectedRedeemableCDOGEDOLAForDOGEDOLA),
            );
          });
        });
      });
    });

    describe("(2) - mint all earnable DOGEDOLA from burned DOGEDOLA", function () {
      beforeEach(async function () {
        await this.regulator.incrementEpochE(); // 1

        await this.regulator.incrementTotalBondedE(1000000);
        await this.regulator.mintToE(this.regulator.address, 1000000);

        await this.regulator.mintToE(userAddress, new BN(10));
        await this.dollar.approve(this.regulator.address, new BN(10), { from: userAddress });

        await this.regulator.burnDOGEDOLAForCDOGEDOLAAndBond(new BN(10), { from: userAddress });

        await this.regulator.incrementEpochE(); // 2
      });

      describe("on step", function () {
        beforeEach(async function () {
          await this.oracle.set(101, 100, true);
          this.expectedReward = 200;
          this.bondedReward = 48;
          this.treasureReward = 12;

          this.result = await this.regulator.stepE();
          this.txHash = this.result.tx;
        });

        it("mints new Dollar tokens", async function () {
          expect(await this.dollar.totalSupply()).to.be.bignumber.equal(
            new BN(1000000).add(new BN(this.expectedReward)),
          );

          expect(await this.cdogedola.totalSupply()).to.be.bignumber.equal(
            new BN(10), // no cDOGEDOLA was minted during expansion
          );

          expect(await this.dollar.balanceOf(await this.regulator.treasuryE())).to.be.bignumber.equal(
            new BN(this.treasureReward),
          );
        });

        it("updates totals", async function () {
          expect(await this.regulator.totalStaged()).to.be.bignumber.equal(new BN(0));
          expect(await this.regulator.totalBonded()).to.be.bignumber.equal(
            new BN(1000000).add(new BN(this.bondedReward)),
          );

          expect(await this.regulator.totalCDOGEDOLARedeemable()).to.be.bignumber.equal(new BN(this.expectedReward));
        });

        it("emits SupplyIncrease event", async function () {
          const event = await expectEvent.inTransaction(this.txHash, MockRegulator, "SupplyIncrease", {});

          expect(event.args.epoch).to.be.bignumber.equal(new BN(7));
          expect(event.args.price).to.be.bignumber.equal(new BN(101).mul(new BN(10).pow(new BN(16))));
          expect(event.args.newRedeemable).to.be.bignumber.equal(new BN(this.expectedReward));
          expect(event.args.newBonded).to.be.bignumber.equal(new BN(this.expectedReward * 2));
        });
      });
    });

    describe("(3) - above limit (price 1.05), business as usual", function () {
      beforeEach(async function () {
        await this.regulator.incrementEpochE(); // 1

        await this.regulator.incrementTotalBondedE(1000000);
        await this.regulator.mintToE(this.regulator.address, 1000000);

        await this.regulator.mintToE(userAddress, new BN(100000));
        await this.dollar.approve(this.regulator.address, new BN(100000), { from: userAddress });

        await this.regulator.burnDOGEDOLAForCDOGEDOLAAndBond(new BN(100000), { from: userAddress });

        await this.regulator.incrementEpochE(); // 2
      });

      describe("on step", function () {
        beforeEach(async function () {
          await this.oracle.set(105, 100, true);
          this.expectedReward = 760;

          this.expectedRedeemableCDOGEDOLAForDOGEDOLA = 100000 * 2;

          this.expectedRewardTreasure = 60;

          this.result = await this.regulator.stepE();
          this.txHash = this.result.tx;
        });

        it("mints new Dollar tokens", async function () {
          expect(await this.dollar.totalSupply()).to.be.bignumber.equal(
            new BN(1000000).add(new BN(this.expectedReward)),
          );

          expect(await this.cdogedola.totalSupply()).to.be.bignumber.equal(
            new BN(100000), // no cDOGEDOLA was minted during expansion
          );
          expect(await this.dollar.balanceOf(this.regulator.address)).to.be.bignumber.equal(new BN(1000000));

          expect(await this.dollar.balanceOf(await this.regulator.treasuryE())).to.be.bignumber.equal(
            new BN(this.expectedRewardTreasure),
          );
        });

        it("updates totals", async function () {
          expect(await this.regulator.totalStaged()).to.be.bignumber.equal(new BN(0));
          expect(await this.regulator.totalBonded()).to.be.bignumber.equal(new BN(1000000));

          expect(await this.regulator.totalCDOGEDOLARedeemable()).to.be.bignumber.equal(
            new BN(this.expectedRedeemableCDOGEDOLAForDOGEDOLA),
          );
        });

        it("emits SupplyIncrease event", async function () {
          const event = await expectEvent.inTransaction(this.txHash, MockRegulator, "SupplyIncrease", {});

          expect(event.args.epoch).to.be.bignumber.equal(new BN(7));
          expect(event.args.price).to.be.bignumber.equal(new BN(105).mul(new BN(10).pow(new BN(16))));
          expect(event.args.newRedeemable).to.be.bignumber.equal(new BN(this.expectedRedeemableCDOGEDOLAForDOGEDOLA));
          expect(event.args.newBonded).to.be.bignumber.equal(
            new BN(this.expectedReward + this.expectedRedeemableCDOGEDOLAForDOGEDOLA),
          );
        });
      });
    });

    describe("down regulation", function () {
      describe("under limit, no DOGEDOLA burned", function () {
        beforeEach(async function () {
          await this.regulator.incrementEpochE(); // 1
          await this.regulator.incrementEpochE(); // 2

          await this.regulator.incrementTotalBondedE(1000000);
          await this.regulator.mintToE(this.regulator.address, 1000000);

          await this.regulator.incrementEpochE(); // 3
        });

        describe("on step", function () {
          beforeEach(async function () {
            await this.oracle.set(85, 100, true);
            this.expectedDOGEDOLAContraction = 51;

            this.result = await this.regulator.stepE();
            this.txHash = this.result.tx;
          });

          it("mints new Dollar for bonded tokens", async function () {
            expect(await this.dollar.totalSupply()).to.be.bignumber.equal(
              new BN(1000000).add(new BN(this.expectedDOGEDOLAContraction)),
            );

            expect(await this.cdogedola.totalSupply()).to.be.bignumber.equal(new BN(0));

            expect(await this.dollar.balanceOf(this.regulator.address)).to.be.bignumber.equal(
              new BN(1000000).add(new BN(this.expectedDOGEDOLAContraction)),
            );
          });

          it("updates totals", async function () {
            expect(await this.regulator.totalStaged()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalBonded()).to.be.bignumber.equal(
              new BN(1000000).add(new BN(this.expectedDOGEDOLAContraction)),
            );
            expect(await this.regulator.totalCDOGEDOLABonded()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalCDOGEDOLADeposited()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalCDOGEDOLAEarnable()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalCDOGEDOLARedeemable()).to.be.bignumber.equal(new BN(0));
          });

          it("emits ContractionIncentives event", async function () {
            const event = await expectEvent.inTransaction(this.txHash, MockRegulator, "ContractionIncentives", {});

            expect(event.args.epoch).to.be.bignumber.equal(new BN(8));
            expect(event.args.price).to.be.bignumber.equal(new BN(85).mul(new BN(10).pow(new BN(16))));
            expect(event.args.delta).to.be.bignumber.equal(new BN(51));
          });
        });
      });

      describe("bonded DOGEDOLA, with some burned DOGEDOLA but no bonded CDOGEDOLA", function () {
        beforeEach(async function () {
          await this.regulator.incrementEpochE(); // 1

          await this.regulator.incrementTotalBondedE(1000000);
          await this.regulator.mintToE(this.regulator.address, 1000000);

          await this.regulator.mintToE(userAddress, new BN(100));
          await this.dollar.approve(this.regulator.address, new BN(100), {
            from: userAddress,
          });

          await this.regulator.burnDOGEDOLAForCDOGEDOLA(new BN(100), { from: userAddress });

          await this.regulator.incrementEpochE(); // 2
        });

        describe("on step", function () {
          beforeEach(async function () {
            await this.oracle.set(99, 100, true);
            this.expectedDOGEDOLAContraction = 51;

            this.result = await this.regulator.stepE();
            this.txHash = this.result.tx;
          });

          it("mints new Dollar for bonded tokens", async function () {
            expect(await this.dollar.totalSupply()).to.be.bignumber.equal(
              new BN(1000000).add(new BN(this.expectedDOGEDOLAContraction)),
            );
            expect(await this.dollar.balanceOf(this.regulator.address)).to.be.bignumber.equal(
              new BN(1000000).add(new BN(this.expectedDOGEDOLAContraction)),
            );
            expect(await this.dollar.balanceOf(userAddress)).to.be.bignumber.equal(new BN(0));

            expect(await this.cdogedola.totalSupply()).to.be.bignumber.equal(new BN(100));
            expect(await this.cdogedola.balanceOf(this.regulator.address)).to.be.bignumber.equal(new BN(0));
            expect(await this.cdogedola.balanceOf(userAddress)).to.be.bignumber.equal(new BN(100)); // value of burned DOGEDOLA == value of CDOGEDOLA

            expect(await this.regulator.balanceOfCDOGEDOLABonded(userAddress)).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.depositedCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(0));

            expect(await this.regulator.redeemedCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.earnableCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(100));
          });

          it("updates totals", async function () {
            expect(await this.regulator.totalStaged()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalBonded()).to.be.bignumber.equal(
              new BN(1000000).add(new BN(this.expectedDOGEDOLAContraction)),
            );
            expect(await this.regulator.totalCDOGEDOLABonded()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalCDOGEDOLADeposited()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalCDOGEDOLAEarnable()).to.be.bignumber.equal(new BN(100));
            expect(await this.regulator.totalCDOGEDOLARedeemable()).to.be.bignumber.equal(new BN(0));
          });

          it("emits ContractionIncentives event", async function () {
            const event = await expectEvent.inTransaction(this.txHash, MockRegulator, "ContractionIncentives", {});

            expect(event.args.epoch).to.be.bignumber.equal(new BN(7));
            expect(event.args.price).to.be.bignumber.equal(new BN(99).mul(new BN(10).pow(new BN(16))));
            expect(event.args.delta).to.be.bignumber.equal(new BN(51));
          });
        });
      });

      describe("bonded DOGEDOLA, with some burned DOGEDOLA AND bonded CDOGEDOLA", function () {
        beforeEach(async function () {
          await this.regulator.incrementEpochE(); // 1

          await this.regulator.incrementTotalBondedE(1000000);
          await this.regulator.mintToE(this.regulator.address, 1000000);

          await this.regulator.mintToE(userAddress, new BN(100));
          await this.dollar.approve(this.regulator.address, new BN(100), {
            from: userAddress,
          });

          await this.regulator.burnDOGEDOLAForCDOGEDOLAAndBond(new BN(100), { from: userAddress });

          await this.regulator.incrementEpochE(); // 2
        });

        describe("on step", function () {
          beforeEach(async function () {
            await this.oracle.set(99, 100, true);
            this.expectedDOGEDOLAContraction = 51;

            this.result = await this.regulator.stepE();
            this.txHash = this.result.tx;
          });

          it("mints new Dollar for bonded tokens", async function () {
            expect(await this.dollar.totalSupply()).to.be.bignumber.equal(
              new BN(1000000).add(new BN(this.expectedDOGEDOLAContraction)),
            );
            expect(await this.dollar.balanceOf(this.regulator.address)).to.be.bignumber.equal(
              new BN(1000000).add(new BN(this.expectedDOGEDOLAContraction)),
            );
            expect(await this.dollar.balanceOf(userAddress)).to.be.bignumber.equal(new BN(0));

            expect(await this.cdogedola.totalSupply()).to.be.bignumber.equal(new BN(100));
            expect(await this.cdogedola.balanceOf(this.regulator.address)).to.be.bignumber.equal(new BN(100)); // burned + 100% of burned
            expect(await this.cdogedola.balanceOf(userAddress)).to.be.bignumber.equal(new BN(0)); // value is bonded to DAO

            expect(await this.regulator.balanceOfCDOGEDOLABonded(userAddress)).to.be.bignumber.equal(new BN(100));
            expect(await this.regulator.depositedCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(100));
            expect(await this.regulator.redeemedCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.earnableCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(100));
          });

          it("updates totals", async function () {
            expect(await this.regulator.totalStaged()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalBonded()).to.be.bignumber.equal(
              new BN(1000000).add(new BN(this.expectedDOGEDOLAContraction)),
            );
            expect(await this.regulator.totalCDOGEDOLABonded()).to.be.bignumber.equal(
              new BN(100), // same as this.cdogedola.balanceOf(this.regulator.address)
            );
            expect(await this.regulator.totalCDOGEDOLADeposited()).to.be.bignumber.equal(new BN(100));
            expect(await this.regulator.totalCDOGEDOLAEarnable()).to.be.bignumber.equal(new BN(100));
            expect(await this.regulator.totalCDOGEDOLARedeemable()).to.be.bignumber.equal(new BN(0));
          });

          it("emits ContractionIncentives event", async function () {
            const event = await expectEvent.inTransaction(this.txHash, MockRegulator, "ContractionIncentives", {});

            expect(event.args.epoch).to.be.bignumber.equal(new BN(7));
            expect(event.args.price).to.be.bignumber.equal(new BN(99).mul(new BN(10).pow(new BN(16))));
            expect(event.args.delta).to.be.bignumber.equal(new BN(51));
          });
        });
      });

      describe("price under (0.95), business as usual", function () {
        beforeEach(async function () {
          await this.regulator.incrementEpochE(); // 1

          await this.regulator.incrementTotalBondedE(1000000);
          await this.regulator.mintToE(this.regulator.address, 1000000);

          await this.regulator.mintToE(userAddress, new BN(1000));
          await this.dollar.approve(this.regulator.address, new BN(1000), {
            from: userAddress,
          });

          await this.regulator.burnDOGEDOLAForCDOGEDOLAAndBond(new BN(1000), { from: userAddress });

          await this.regulator.incrementEpochE(); // 2
        });

        describe("on step", function () {
          beforeEach(async function () {
            await this.oracle.set(95, 100, true);
            this.expectedDOGEDOLAContraction = 51;

            this.result = await this.regulator.stepE();
            this.txHash = this.result.tx;
          });

          it("mints new Dollar for bonded tokens", async function () {
            expect(await this.dollar.totalSupply()).to.be.bignumber.equal(
              new BN(1000000).add(new BN(this.expectedDOGEDOLAContraction)),
            );
            expect(await this.dollar.balanceOf(this.regulator.address)).to.be.bignumber.equal(
              new BN(1000000).add(new BN(this.expectedDOGEDOLAContraction)),
            );
            expect(await this.dollar.balanceOf(userAddress)).to.be.bignumber.equal(new BN(0));

            expect(await this.cdogedola.totalSupply()).to.be.bignumber.equal(new BN(1000));
            expect(await this.cdogedola.balanceOf(this.regulator.address)).to.be.bignumber.equal(new BN(1000)); // burned + 100% of burned
            expect(await this.cdogedola.balanceOf(userAddress)).to.be.bignumber.equal(new BN(0)); // value is bonded to DAO

            expect(await this.regulator.balanceOfCDOGEDOLABonded(userAddress)).to.be.bignumber.equal(new BN(1000));
            expect(await this.regulator.depositedCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(1000));

            expect(await this.regulator.redeemedCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.earnableCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(1000)); // 100% of what was burned
          });

          it("updates totals", async function () {
            expect(await this.regulator.totalStaged()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalBonded()).to.be.bignumber.equal(
              new BN(1000000).add(new BN(this.expectedDOGEDOLAContraction)),
            );
            expect(await this.regulator.totalCDOGEDOLABonded()).to.be.bignumber.equal(new BN(1000));
            expect(await this.regulator.totalCDOGEDOLADeposited()).to.be.bignumber.equal(new BN(1000));
            expect(await this.regulator.totalCDOGEDOLAEarnable()).to.be.bignumber.equal(new BN(1000));
            expect(await this.regulator.totalCDOGEDOLARedeemable()).to.be.bignumber.equal(new BN(0));
          });

          it("emits ContractionIncentives event", async function () {
            const event = await expectEvent.inTransaction(this.txHash, MockRegulator, "ContractionIncentives", {});

            expect(event.args.epoch).to.be.bignumber.equal(new BN(7));
            expect(event.args.price).to.be.bignumber.equal(new BN(95).mul(new BN(10).pow(new BN(16))));
            expect(event.args.delta).to.be.bignumber.equal(new BN(51));
          });
        });
      });

      describe("price under (0.95), multiple buyers business as usual", function () {
        beforeEach(async function () {
          await this.regulator.incrementEpochE(); // 1

          await this.regulator.incrementTotalBondedE(1000000);
          await this.regulator.mintToE(this.regulator.address, 1000000);

          // user0
          await this.regulator.mintToE(userAddress, new BN(1000));
          await this.dollar.approve(this.regulator.address, new BN(500), {
            from: userAddress,
          });

          await this.regulator.burnDOGEDOLAForCDOGEDOLAAndBond(new BN(500), { from: userAddress });
          // user1
          await this.regulator.mintToE(userAddress1, new BN(100));
          await this.dollar.approve(this.regulator.address, new BN(100), {
            from: userAddress1,
          });
          await this.regulator.burnDOGEDOLAForCDOGEDOLAAndBond(new BN(100), { from: userAddress1 });
          // user2
          await this.regulator.mintToE(userAddress2, new BN(400));
          await this.dollar.approve(this.regulator.address, new BN(400), {
            from: userAddress2,
          });
          await this.regulator.burnDOGEDOLAForCDOGEDOLA(new BN(200), { from: userAddress2 }); // only burning
          await this.regulator.burnDOGEDOLAForCDOGEDOLAAndBond(new BN(200), { from: userAddress2 });

          await this.regulator.incrementEpochE(); // 2
        });

        describe("on step", function () {
          beforeEach(async function () {
            await this.oracle.set(95, 100, true);
            this.expectedDOGEDOLAContraction = 51;
            this.cdogedolaCreatedFromBurnedDOGEDOLA = 500 + 51;
            this.cdogedolaCreatedFromBurnedDOGEDOLAAndBonded = 500 + 100 + 200;

            this.result = await this.regulator.stepE();
            this.txHash = this.result.tx;
          });

          it("mints new Dollar for bonded tokens", async function () {
            expect(await this.dollar.totalSupply()).to.be.bignumber.equal(
              new BN(1000000).add(new BN(this.cdogedolaCreatedFromBurnedDOGEDOLA)),
            );
            expect(await this.dollar.balanceOf(this.regulator.address)).to.be.bignumber.equal(
              new BN(1000000).add(new BN(this.expectedDOGEDOLAContraction)),
            ); // userAddress burned 500 of his DOGEDOLA, leaving 500 freefloating
            expect(await this.dollar.balanceOf(userAddress)).to.be.bignumber.equal(new BN(500)); // only burned and 500
            expect(await this.dollar.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(0));
            expect(await this.dollar.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(0));

            expect(await this.cdogedola.totalSupply()).to.be.bignumber.equal(new BN(1000));
            expect(await this.cdogedola.balanceOf(this.regulator.address)).to.be.bignumber.equal(
              new BN(this.cdogedolaCreatedFromBurnedDOGEDOLAAndBonded),
            );
            expect(await this.cdogedola.balanceOf(userAddress)).to.be.bignumber.equal(new BN(0)); // value is bonded to DAO
            expect(await this.cdogedola.balanceOf(userAddress1)).to.be.bignumber.equal(new BN(0)); // value is bonded to DAO
            expect(await this.cdogedola.balanceOf(userAddress2)).to.be.bignumber.equal(new BN(200)); // burned 400 and bonded 200; still 200 in wallet

            expect(await this.regulator.balanceOfCDOGEDOLABonded(userAddress)).to.be.bignumber.equal(new BN(500));
            expect(await this.regulator.depositedCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(500));

            expect(await this.regulator.redeemedCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.earnableCDOGEDOLAByAccount(userAddress)).to.be.bignumber.equal(new BN(500));

            expect(await this.regulator.balanceOfCDOGEDOLABonded(userAddress1)).to.be.bignumber.equal(new BN(100));
            expect(await this.regulator.depositedCDOGEDOLAByAccount(userAddress1)).to.be.bignumber.equal(new BN(100));

            expect(await this.regulator.redeemedCDOGEDOLAByAccount(userAddress1)).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.earnableCDOGEDOLAByAccount(userAddress1)).to.be.bignumber.equal(new BN(100));

            expect(await this.regulator.balanceOfCDOGEDOLABonded(userAddress2)).to.be.bignumber.equal(new BN(200)); // burned 400 but bonded 200
            expect(await this.regulator.depositedCDOGEDOLAByAccount(userAddress2)).to.be.bignumber.equal(new BN(200));

            expect(await this.regulator.redeemedCDOGEDOLAByAccount(userAddress2)).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.earnableCDOGEDOLAByAccount(userAddress2)).to.be.bignumber.equal(new BN(400));
          });

          it("updates totals", async function () {
            expect(await this.regulator.totalStaged()).to.be.bignumber.equal(new BN(0));
            expect(await this.regulator.totalBonded()).to.be.bignumber.equal(
              new BN(1000000).add(new BN(this.expectedDOGEDOLAContraction)),
            );
            expect(await this.regulator.totalCDOGEDOLABonded()).to.be.bignumber.equal(
              new BN(this.cdogedolaCreatedFromBurnedDOGEDOLAAndBonded),
            );
            expect(await this.regulator.totalCDOGEDOLADeposited()).to.be.bignumber.equal(
              new BN(this.cdogedolaCreatedFromBurnedDOGEDOLAAndBonded),
            );
            expect(await this.regulator.totalCDOGEDOLAEarnable()).to.be.bignumber.equal(new BN(1000));
            expect(await this.regulator.totalCDOGEDOLARedeemable()).to.be.bignumber.equal(new BN(0));
          });

          it("emits ContractionIncentives event", async function () {
            const event = await expectEvent.inTransaction(this.txHash, MockRegulator, "ContractionIncentives", {});

            expect(event.args.epoch).to.be.bignumber.equal(new BN(7));
            expect(event.args.price).to.be.bignumber.equal(new BN(95).mul(new BN(10).pow(new BN(16))));
            expect(event.args.delta).to.be.bignumber.equal(new BN(this.expectedDOGEDOLAContraction));
          });
        });
      });
    });

    describe("neutral regulation", function () {
      beforeEach(async function () {
        await this.regulator.incrementEpochE(); // 1

        await this.regulator.incrementTotalBondedE(1000000);
        await this.regulator.mintToE(this.regulator.address, 1000000);

        await this.regulator.incrementEpochE(); // 2
      });

      describe("on step", function () {
        beforeEach(async function () {
          await this.oracle.set(100, 100, true);
          this.result = await this.regulator.stepE();
          this.txHash = this.result.tx;
        });

        it("doesnt mint new Dollar tokens", async function () {
          expect(await this.dollar.totalSupply()).to.be.bignumber.equal(new BN(1000000));
          expect(await this.dollar.balanceOf(this.regulator.address)).to.be.bignumber.equal(new BN(1000000));
          expect(await this.dollar.balanceOf(poolAddress)).to.be.bignumber.equal(new BN(0));
        });

        it("updates totals", async function () {
          expect(await this.regulator.totalStaged()).to.be.bignumber.equal(new BN(0));
          expect(await this.regulator.totalBonded()).to.be.bignumber.equal(new BN(1000000));
          expect(await this.regulator.totalDebt()).to.be.bignumber.equal(new BN(0));
          expect(await this.regulator.totalSupply()).to.be.bignumber.equal(new BN(0));
          expect(await this.regulator.totalCoupons()).to.be.bignumber.equal(new BN(0));
          expect(await this.regulator.totalRedeemable()).to.be.bignumber.equal(new BN(0));
        });

        it("emits SupplyNeutral event", async function () {
          const event = await expectEvent.inTransaction(this.txHash, MockRegulator, "SupplyNeutral", {});

          expect(event.args.epoch).to.be.bignumber.equal(new BN(7));
        });
      });
    });

    describe("not valid", function () {
      beforeEach(async function () {
        await this.regulator.incrementEpochE(); // 1

        await this.regulator.incrementTotalBondedE(1000000);
        await this.regulator.mintToE(this.regulator.address, 1000000);

        await this.regulator.incrementEpochE(); // 2
      });

      describe("on step", function () {
        beforeEach(async function () {
          await this.oracle.set(105, 100, false);
          this.result = await this.regulator.stepE();
          this.txHash = this.result.tx;
        });

        it("doesnt mint new Dollar tokens", async function () {
          expect(await this.dollar.totalSupply()).to.be.bignumber.equal(new BN(1000000));
          expect(await this.dollar.balanceOf(this.regulator.address)).to.be.bignumber.equal(new BN(1000000));
          expect(await this.dollar.balanceOf(poolAddress)).to.be.bignumber.equal(new BN(0));
        });

        it("updates totals", async function () {
          expect(await this.regulator.totalStaged()).to.be.bignumber.equal(new BN(0));
          expect(await this.regulator.totalBonded()).to.be.bignumber.equal(new BN(1000000));
          expect(await this.regulator.totalDebt()).to.be.bignumber.equal(new BN(0));
          expect(await this.regulator.totalSupply()).to.be.bignumber.equal(new BN(0));
          expect(await this.regulator.totalCoupons()).to.be.bignumber.equal(new BN(0));
          expect(await this.regulator.totalRedeemable()).to.be.bignumber.equal(new BN(0));
        });

        it("emits SupplyNeutral event", async function () {
          const event = await expectEvent.inTransaction(this.txHash, MockRegulator, "SupplyNeutral", {});

          expect(event.args.epoch).to.be.bignumber.equal(new BN(7));
        });
      });
    });
  });
});
