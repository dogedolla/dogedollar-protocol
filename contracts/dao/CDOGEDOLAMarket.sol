/*
    Copyright 2022 Dynamic Dollar Devs, based on the works of the Empty Set Squad

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

pragma solidity ^0.5.17;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Comptroller.sol";
import "../Constants.sol";

contract CDOGEDOLAMarket is Comptroller {
    using SafeMath for uint256;

    event DOGEDOLABurned(address indexed account, uint256 amount);
    event CDOGEDOLAMinted(address indexed account, uint256 amount);
    event CDOGEDOLARedeemed(address indexed account, uint256 amount);
    event BondCDOGEDOLA(address indexed account, uint256 start, uint256 amount);
    event UnbondCDOGEDOLA(address indexed account, uint256 start, uint256 amount);

    function burnDOGEDOLAForCDOGEDOLA(uint256 amount) public {
        require(_state13.price.lessThan(Decimal.one()), "Market: not in contraction");

        // deposit and burn DOGEDOLA
        dollar().transferFrom(msg.sender, address(this), amount);
        dollar().burn(amount);
        balanceCheck();

        // mint equivalent CDOGEDOLA
        cdogedola().mint(msg.sender, amount);

        // increment earnable
        uint256 earnable = Decimal.D256({value: amount}).mul(Getters.getEarnableFactor()).value; //DIP-17
        incrementBalanceOfEarnableCDOGEDOLA(msg.sender,  earnable);
        incrementTotalCDOGEDOLAEarnable(earnable);

        emit DOGEDOLABurned(msg.sender, amount);
        emit CDOGEDOLAMinted(msg.sender, amount);
    }

    function migrateCouponsToCDOGEDOLA(uint256 couponEpoch) public returns (uint256) {
        uint256 couponAmount = balanceOfCoupons(msg.sender, couponEpoch);
        uint256 couponUnderlyingAmount = balanceOfCouponUnderlying(msg.sender, couponEpoch);

        // coupons not yet migrated to DIP-13
        if (couponAmount == 0 && couponUnderlyingAmount == 0 && outstandingCoupons(couponEpoch) == 0){
            couponUnderlyingAmount = _state.accounts[msg.sender].coupons[couponEpoch].div(2);
        }

        // set coupon & underlying balances to 0
        _state13.couponUnderlyingByAccount[msg.sender][couponEpoch] = 0;
        _state.accounts[msg.sender].coupons[couponEpoch] = 0;

        // mint CDOGEDOLA
        uint256 totalAmount = couponAmount.add(couponUnderlyingAmount);
        cdogedola().mint(msg.sender, totalAmount);

        emit CDOGEDOLAMinted(msg.sender, totalAmount);

        return totalAmount;
    }

    function burnDOGEDOLAForCDOGEDOLAAndBond(uint256 amount) external {
        burnDOGEDOLAForCDOGEDOLA(amount);

        bondCDOGEDOLA(amount);
    }

    function migrateCouponsToCDOGEDOLAAndBond(uint256 couponEpoch) external {
        uint256 amountToBond = migrateCouponsToCDOGEDOLA(couponEpoch);

        bondCDOGEDOLA(amountToBond);
    }

    function bondCDOGEDOLA(uint256 amount) public {
        require(amount > 0, "Market: bound must be greater than 0");

        // update earned amount
        (uint256 userBonded, uint256 userDeposited,) = updateUserEarned(msg.sender);

        // deposit CDOGEDOLA amount
        cdogedola().transferFrom(msg.sender, address(this), amount);

        uint256 totalAmount = userBonded.add(amount);
        setDepositedCDOGEDOLAAmount(msg.sender, totalAmount);

        decrementTotalCDOGEDOLADeposited(userDeposited, "Market: insufficient total deposited");
        incrementTotalCDOGEDOLADeposited(totalAmount);

        emit BondCDOGEDOLA(msg.sender, epoch().add(1), amount);
    }

    function unbondCDOGEDOLA(uint256 amount) external {
        // we cannot allow for CDOGEDOLA unbonds during expansions, to enforce the pro-rata redemptions
        require(_state13.price.lessThan(Decimal.one()), "Market: not in contraction");

        _unbondCDOGEDOLA(amount);

        // withdraw CDOGEDOLA
        cdogedola().transfer(msg.sender, amount);

        emit UnbondCDOGEDOLA(msg.sender, epoch().add(1), amount);
    }

    function _unbondCDOGEDOLA(uint256 amount) internal {
        // update earned amount
        (uint256 userBonded, uint256 userDeposited,) = updateUserEarned(msg.sender);

        require(amount > 0 && userBonded > 0, "Market: amounts > 0!");
        require(amount <= userBonded, "Market: insufficient amount to unbound");

        // update deposited amount
        uint256 userTotalAmount = userBonded.sub(amount);
        setDepositedCDOGEDOLAAmount(msg.sender, userTotalAmount);

        decrementTotalCDOGEDOLADeposited(userDeposited, "Market: insufficient deposited");
        incrementTotalCDOGEDOLADeposited(userTotalAmount);
    }

    function redeemBondedCDOGEDOLAForDOGEDOLA(uint256 amount) external {
        require(_state13.price.greaterThan(Decimal.one()), "Market: not in expansion");
        require(amount > 0, "Market: amounts > 0!");

        // check if user is allowed to redeem this amount
        require(amount <= getCurrentRedeemableCDOGEDOLAByAccount(msg.sender), "Market: not enough redeemable");

        // unbond redeemed amount
        _unbondCDOGEDOLA(amount);

        // burn CDOGEDOLA
        cdogedola().burn(amount);
        // mint DOGEDOLA
        mintToAccount(msg.sender, amount);

        addRedeemedThisExpansion(msg.sender, amount);
        incrementTotalCDOGEDOLARedeemed(amount);

        emit CDOGEDOLARedeemed(msg.sender, amount);
    }

    function updateUserEarned(address account) internal returns (uint256 userBonded, uint256 userDeposited, uint256 userEarned) {
        userBonded = balanceOfCDOGEDOLABonded(account);
        userDeposited = depositedCDOGEDOLAByAccount(account);
        userEarned = userBonded.sub(userDeposited);
        
        if (userEarned > 0) {
            incrementBalanceOfEarnedCDOGEDOLA(account, userEarned);
            // mint acrued interest interest to DAO
            cdogedola().mint(address(this), userEarned);
            incrementTotalCDOGEDOLAEarned(userEarned);
        }

        // update multiplier entry
        setCurrentInterestMultiplier(account);
    }
}
