import { getOrderItemStats } from "@/graphql/resolvers";

describe("getOrderItemStats", () =>
  it("counts statuses", () =>
    expect(
      getOrderItemStats([
        { status: "PENDING" },
        { status: "PENDING" },
        { status: "CANCELED" },
        { status: "SHIPPED" },
        { status: "DELIVERED" },
      ])
    ).toEqual({
      PENDING: 2,
      CANCELED: 1,
      DELIVERED: 1,
      SHIPPED: 1,
    })));
