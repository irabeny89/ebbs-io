import config from "../config";
import type { OrderItemType } from "types";

const getLastCartItemsFromStorage = (
  localStorage: any
): OrderItemType[] => {
  // get previous data from local storage
  const lastItems = localStorage.getItem(
    config.appData.constants.CART_ITEMS_KEY
  );
  // unserialize data if exist or return empty array
  return lastItems ? JSON.parse(lastItems) : [];
};

export default getLastCartItemsFromStorage;
