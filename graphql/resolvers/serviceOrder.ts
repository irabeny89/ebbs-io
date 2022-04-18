import { getOrderItemStats } from "utils/";
import { OrderType } from "types";

const ServiceOrder = {
  orderStats: ({ items }: OrderType) => getOrderItemStats(items),
};

export default ServiceOrder;
