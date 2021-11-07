# DIP- 10

## User Stories

In any state:

- As a user who holds freefloat DOGEDOLA, I am able to burn DOGEDOLA for cDOGEDOLA 1:1
- As a user who holds coupons, I am able to migrate coupons (principal+premium) to cDOGEDOLA
- As a user who holds cDOGEDOLA, I am able to bond cDOGEDOLA to the DAO

When the protocol is in contraction:

- Bonded cDOGEDOLA receives 95% of contraction rewards (former debt) per epoch
  ..\* As a user with bonded cDOGEDOLA, I am only able to receive up to 100% of cDOGEDOLA that I have bonded to the DAO
- Bonded DOGEDOLA receives 5% of contraction rewards per epoch (capped at 0.006% > 20% APY)
- As a user I am not able to buy coupons anymore (as there is no debt anymore)
- As a user who holds freefloat or bonded cDOGEDOLA, I am NOT able to redeem cDOGEDOLA for DOGEDOLA

When the protocol is in expansion:

- As a user who holds cDOGEDOLA bonded to the DAO, I am able to redeem a partial amount of my bonded cDOGEDOLA for DOGEDOLA 1:1 per epoch.
  ..\* While there are unredeemable cDOGEDOLA, 50% of expansion rewards get distributed to cDOGEDOLA distributers, pro-rata to their holdings, making them redeemable 1:1 to DOGEDOLA
- As a user who holds freefloat cDOGEDOLA, I am NOT able to redeem my cDOGEDOLA for DOGEDOLA.

## Requirements

**DOGEDOLA**: No changes to the ERC20 token (aka freefloat DOGEDOLA)

**cDOGEDOLA**: New ERC20 token which represents protocol contraction rewards (former debt as coupons)

**DAO**: Same but with additional features:

1. Mints cDOGEDOLA in exchange for DOGEDOLA 1:1 when TWAP < $1
1. Mints cDOGEDOLA in exchange for coupons (principal + premium)
1. Permits cDOGEDOLA to be bonded
1. Provides 95% of contraction rewards to bonded cDOGEDOLA users
1. Provides 5% of contraction rewards to bonded DOGEDOLA users
1. Redeems bonded cDOGEDOLA for DOGEDOLA when TWAP > $1 on a partial basis. 50% of the amount designated for expansion rewards are distributed to cDOGEDOLA redemption per epoch

**Coupons**: Remove ability to purchase and redeem coupons. The goal is to phase it out slowly
