import type { BuyerCustomerAddress, BuyerCustomerAddressInput } from "../../lib/buyer-api"

export const customerAddressToInput = (address: BuyerCustomerAddress): BuyerCustomerAddressInput => ({ ...address })
