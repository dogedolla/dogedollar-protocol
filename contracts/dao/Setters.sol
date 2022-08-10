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
import "./State.sol";
import "./Getters.sol";

contract Setters is State, Getters {
    using SafeMath for uint256;

    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * ERC20 Interface
     */

    function transfer(address recipient, uint256 amount) external returns (bool) {
        return false;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        return false;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool) {
        return false;
    }

    /**
     * Global
     */

    function incrementTotalBonded(uint256 amount) internal {
        _state.balance.bonded = _state.balance.bonded.add(amount);
    }

    function decrementTotalBonded(uint256 amount, string memory reason) internal {
        _state.balance.bonded = _state.balance.bonded.sub(amount, reason);
    }

    function incrementTotalDebt(uint256 amount) internal {
        _state.balance.debt = _state.balance.debt.add(amount);
    }

    function decrementTotalDebt(uint256 amount, string memory reason) internal {
        _state.balance.debt = _state.balance.debt.sub(amount, reason);
    }

    function setDebtToZero() internal {
        _state.balance.debt = 0;
    }

    function incrementTotalRedeemable(uint256 amount) internal {
        _state.balance.redeemable = _state.balance.redeemable.add(amount);
    }

    function decrementTotalRedeemable(uint256 amount, string memory reason) internal {
        _state.balance.redeemable = _state.balance.redeemable.sub(amount, reason);
    }

    // DIP-10

    function setGlobalInterestMultiplier(uint256 multiplier) internal {
        _state10.globalInterestMultiplier = multiplier;
    }

    function setExpansionStartEpoch(uint256 epoch) internal {
        _state10.expansionStartEpoch = epoch;
    }

    function incrementTotalCDOGEDOLARedeemable(uint256 amount) internal {
        _state10.totalCDOGEDOLARedeemable = _state10.totalCDOGEDOLARedeemable.add(amount);
    }

    function decrementTotalCDOGEDOLARedeemable(uint256 amount, string memory reason) internal {
        _state10.totalCDOGEDOLARedeemable = _state10.totalCDOGEDOLARedeemable.sub(amount, reason);
    }

    function incrementTotalCDOGEDOLARedeemed(uint256 amount) internal {
        _state10.totalCDOGEDOLARedeemed = _state10.totalCDOGEDOLARedeemed.add(amount);
    }

    function decrementTotalCDOGEDOLARedeemed(uint256 amount, string memory reason) internal {
        _state10.totalCDOGEDOLARedeemed = _state10.totalCDOGEDOLARedeemed.sub(amount, reason);
    }

    function clearCDOGEDOLARedeemable() internal {
        _state10.totalCDOGEDOLARedeemable = 0;
        _state10.totalCDOGEDOLARedeemed = 0;
    }

    function incrementTotalCDOGEDOLADeposited(uint256 amount) internal {
        _state10.totalCDOGEDOLADeposited = _state10.totalCDOGEDOLADeposited.add(amount);
    }

    function decrementTotalCDOGEDOLADeposited(uint256 amount, string memory reason) internal {
        _state10.totalCDOGEDOLADeposited = _state10.totalCDOGEDOLADeposited.sub(amount, reason);
    }

    function incrementTotalCDOGEDOLAEarnable(uint256 amount) internal {
        _state10.totalCDOGEDOLAEarnable = _state10.totalCDOGEDOLAEarnable.add(amount);
    }

    function decrementTotalCDOGEDOLAEarnable(uint256 amount, string memory reason) internal {
        _state10.totalCDOGEDOLAEarnable = _state10.totalCDOGEDOLAEarnable.sub(amount, reason);
    }

    function incrementTotalCDOGEDOLAEarned(uint256 amount) internal {
        _state10.totalCDOGEDOLAEarned = _state10.totalCDOGEDOLAEarned.add(amount);
    }

    function decrementTotalCDOGEDOLAEarned(uint256 amount, string memory reason) internal {
        _state10.totalCDOGEDOLAEarned = _state10.totalCDOGEDOLAEarned.sub(amount, reason);
    }

    // end DIP-10

    /**
     * Account
     */

    function incrementBalanceOf(address account, uint256 amount) internal {
        _state.accounts[account].balance = _state.accounts[account].balance.add(amount);
        _state.balance.supply = _state.balance.supply.add(amount);

        emit Transfer(address(0), account, amount);
    }

    function decrementBalanceOf(
        address account,
        uint256 amount,
        string memory reason
    ) internal {
        _state.accounts[account].balance = _state.accounts[account].balance.sub(amount, reason);
        _state.balance.supply = _state.balance.supply.sub(amount, reason);

        emit Transfer(account, address(0), amount);
    }

    function incrementBalanceOfStaged(address account, uint256 amount) internal {
        _state.accounts[account].staged = _state.accounts[account].staged.add(amount);
        _state.balance.staged = _state.balance.staged.add(amount);
    }

    function decrementBalanceOfStaged(
        address account,
        uint256 amount,
        string memory reason
    ) internal {
        _state.accounts[account].staged = _state.accounts[account].staged.sub(amount, reason);
        _state.balance.staged = _state.balance.staged.sub(amount, reason);
    }

    function incrementBalanceOfCoupons(
        address account,
        uint256 epoch,
        uint256 amount
    ) internal {
        _state.accounts[account].coupons[epoch] = _state.accounts[account].coupons[epoch].add(amount);
        _state.epochs[epoch].coupons.outstanding = _state.epochs[epoch].coupons.outstanding.add(amount);
        _state.balance.coupons = _state.balance.coupons.add(amount);
    }

    function incrementBalanceOfCouponUnderlying(
        address account,
        uint256 epoch,
        uint256 amount
    ) internal {
        _state13.couponUnderlyingByAccount[account][epoch] = _state13.couponUnderlyingByAccount[account][epoch].add(
            amount
        );
        _state13.couponUnderlying = _state13.couponUnderlying.add(amount);
    }

    function decrementBalanceOfCoupons(
        address account,
        uint256 epoch,
        uint256 amount,
        string memory reason
    ) internal {
        _state.accounts[account].coupons[epoch] = _state.accounts[account].coupons[epoch].sub(amount, reason);
        _state.epochs[epoch].coupons.outstanding = _state.epochs[epoch].coupons.outstanding.sub(amount, reason);
        _state.balance.coupons = _state.balance.coupons.sub(amount, reason);
    }

    function decrementBalanceOfCouponUnderlying(
        address account,
        uint256 epoch,
        uint256 amount,
        string memory reason
    ) internal {
        _state13.couponUnderlyingByAccount[account][epoch] = _state13.couponUnderlyingByAccount[account][epoch].sub(
            amount,
            reason
        );
        _state13.couponUnderlying = _state13.couponUnderlying.sub(amount, reason);
    }

    function unfreeze(address account) internal {
        _state.accounts[account].fluidUntil = epoch().add(Constants.getDAOExitLockupEpochs());
    }

    function updateAllowanceCoupons(
        address owner,
        address spender,
        uint256 amount
    ) internal {
        _state.accounts[owner].couponAllowances[spender] = amount;
    }

    function decrementAllowanceCoupons(
        address owner,
        address spender,
        uint256 amount,
        string memory reason
    ) internal {
        _state.accounts[owner].couponAllowances[spender] = _state.accounts[owner].couponAllowances[spender].sub(
            amount,
            reason
        );
    }

    // DIP-10
    function incrementBalanceOfDepositedCDOGEDOLA(address account, uint256 amount) internal {
        _state10.accounts[account].depositedCDOGEDOLA = _state10.accounts[account].depositedCDOGEDOLA.add(amount);
    }

    function decrementBalanceOfDepositedCDOGEDOLA(address account, uint256 amount, string memory reason) internal {
        _state10.accounts[account].depositedCDOGEDOLA = _state10.accounts[account].depositedCDOGEDOLA.sub(amount, reason);
    }

    function incrementBalanceOfEarnableCDOGEDOLA(address account, uint256 amount) internal {
        _state10.accounts[account].earnableCDOGEDOLA = _state10.accounts[account].earnableCDOGEDOLA.add(amount);
    }

    function decrementBalanceOfEarnableCDOGEDOLA(address account, uint256 amount, string memory reason) internal {
        _state10.accounts[account].earnableCDOGEDOLA = _state10.accounts[account].earnableCDOGEDOLA.sub(amount, reason);
    }

    function incrementBalanceOfEarnedCDOGEDOLA(address account, uint256 amount) internal {
        _state10.accounts[account].earnedCDOGEDOLA = _state10.accounts[account].earnedCDOGEDOLA.add(amount);
    }

    function decrementBalanceOfEarnedCDOGEDOLA(address account, uint256 amount, string memory reason) internal {
        _state10.accounts[account].earnedCDOGEDOLA = _state10.accounts[account].earnedCDOGEDOLA.sub(amount, reason);
    }

    function incrementBalanceOfRedeemedCDOGEDOLA(address account, uint256 amount) internal {
        _state10.accounts[account].redeemedCDOGEDOLA = _state10.accounts[account].redeemedCDOGEDOLA.add(amount);
    }

    function decrementBalanceOfRedeemedCDOGEDOLA(address account, uint256 amount, string memory reason) internal {
        _state10.accounts[account].redeemedCDOGEDOLA = _state10.accounts[account].redeemedCDOGEDOLA.sub(amount, reason);
    }
    
    function addRedeemedThisExpansion(address account, uint256 amount) internal returns (uint256) {
        uint256 currentExpansion = _state10.expansionStartEpoch;
        uint256 accountExpansion = _state10.accounts[account].lastRedeemedExpansionStart;

        if (currentExpansion != accountExpansion) {
            _state10.accounts[account].redeemedThisExpansion = amount;
            _state10.accounts[account].lastRedeemedExpansionStart = currentExpansion;
        }else{
            _state10.accounts[account].redeemedThisExpansion = _state10.accounts[account].redeemedThisExpansion.add(amount);
        }
    }

    function setCurrentInterestMultiplier(address account) internal returns (uint256) {
        _state10.accounts[account].interestMultiplierEntry = _state10.globalInterestMultiplier;
    }

    function setDepositedCDOGEDOLAAmount(address account, uint256 amount) internal returns (uint256) {
        _state10.accounts[account].depositedCDOGEDOLA = amount;
    }


    // end DIP-10

    /**
     * Epoch
     */

    function incrementEpoch() internal {
        _state.epoch.current = _state.epoch.current.add(1);
    }

    function snapshotTotalBonded() internal {
        _state.epochs[epoch()].bonded = totalSupply();
    }

    function initializeCouponsExpiration(uint256 epoch, uint256 expiration) internal {
        _state.epochs[epoch].coupons.expiration = expiration;
        _state.epochs[expiration].coupons.expiring.push(epoch);
    }

    /**
     * Governance
     */

    function createCandidate(address candidate, uint256 period) internal {
        _state.candidates[candidate].start = epoch();
        _state.candidates[candidate].period = period;
    }

    function recordVote(
        address account,
        address candidate,
        Candidate.Vote vote
    ) internal {
        _state.candidates[candidate].votes[account] = vote;
    }

    function incrementApproveFor(address candidate, uint256 amount) internal {
        _state.candidates[candidate].approve = _state.candidates[candidate].approve.add(amount);
    }

    function decrementApproveFor(
        address candidate,
        uint256 amount,
        string memory reason
    ) internal {
        _state.candidates[candidate].approve = _state.candidates[candidate].approve.sub(amount, reason);
    }

    function incrementRejectFor(address candidate, uint256 amount) internal {
        _state.candidates[candidate].reject = _state.candidates[candidate].reject.add(amount);
    }

    function decrementRejectFor(
        address candidate,
        uint256 amount,
        string memory reason
    ) internal {
        _state.candidates[candidate].reject = _state.candidates[candidate].reject.sub(amount, reason);
    }

    function placeLock(address account, address candidate) internal {
        uint256 currentLock = _state.accounts[account].lockedUntil;
        uint256 newLock = startFor(candidate).add(periodFor(candidate));
        if (newLock > currentLock) {
            _state.accounts[account].lockedUntil = newLock;
        }
    }

    function initialized(address candidate) internal {
        _state.candidates[candidate].initialized = true;
    }
}
