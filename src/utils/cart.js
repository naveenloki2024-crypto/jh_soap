import { SOAP_PRICE, OFFER_GROUP_SIZE, OFFER_GROUP_PRICE } from '../data/products';

export function getCartTotals(cartItems) {
  const unitCount = cartItems.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = unitCount * SOAP_PRICE;
  const offerGroups = Math.floor(unitCount / OFFER_GROUP_SIZE);
  const offeredUnits = offerGroups * OFFER_GROUP_SIZE;
  const savingPerGroup = OFFER_GROUP_SIZE * SOAP_PRICE - OFFER_GROUP_PRICE;
  const discount = offerGroups * savingPerGroup;
  const total = subtotal - discount;

  return {
    unitCount,
    subtotal,
    offerGroups,
    offeredUnits,
    remainingUnits: unitCount - offeredUnits,
    discount,
    total,
    savingPerGroup,
  };
}