import {
  LOGOUT,
  REFRESH_TOKEN_QUERY,
  SET_ORDER_DELIVERY_DATE,
  UPDATE_ORDER_ITEM_STATUS,
  USER_LOGIN,
} from "@/graphql/documentNodes";
import { ApolloServer } from "apollo-server-micro";
import typeDefs from "@/graphql/typeDefs";
import Query from "@/graphql/resolvers/queries";
import Mutation from "@/graphql/resolvers/mutations";
import ServiceOrder from "@/graphql/resolvers/serviceOrder";
import User from "@/graphql/resolvers/user";
import UserService from "@/graphql/resolvers/userService";

jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(() => ({
    aud: "aud",
    sub: "sub",
    username: "username",
    serviceId: "serviceId",
  })),
}));

jest.mock("@/utils/index", () => ({
  authUser: jest.fn(() => ({ accessToken: "accessToken" })),
  setCookie: jest.fn(),
  getAuthPayload: jest.fn(),
  handleError: jest.fn(),
  comparePassword: jest.fn().mockReturnValue("accessToken"),
}));

describe("Apollo Server", () => {
  const testServer = new ApolloServer({
    typeDefs,
    resolvers: { Query, Mutation, User, UserService, ServiceOrder },
    context: () => ({
      req: {
        cookies: { token: "refreshtoken" },
        headers: { authorization: "access token" },
      },
      OrderModel: {
        findByIdAndUpdate: jest.fn(),
        findOneAndUpdate: jest.fn(() => ({
          select: jest.fn(() => ({
            lean: jest.fn(() => ({
              exec: jest.fn(),
            })),
          })),
        })),
        findOne: jest.fn(() => ({
          select: jest.fn(() => ({
            lean: jest.fn(() => ({
              exec: jest.fn(),
            })),
          })),
        })),
      },
      UserModel: {
        findOne: jest.fn(() => ({
          select: jest.fn(() => ({
            lean: jest.fn(() => ({
              exec: jest.fn(),
            })),
          })),
        })),
      },
      ServiceModel: {
        findOne: jest.fn(() => ({
          select: jest.fn(() => ({
            lean: jest.fn(() => ({
              exec: jest.fn(),
            })),
          })),
        })),
      },
    }),
  });
  // QUERIES
  // hello query
  it("returns the string 'world' from hello query", async () => {
    const { data, errors } = await testServer.executeOperation({
      query: "{hello}",
    });

    expect(errors).toBeUndefined();
    expect(data?.hello).toBe("world!");
  });
  // refreshToken query
  it("returns access token from refreshToken query", async () => {
    const { data, errors } = await testServer.executeOperation({
      query: REFRESH_TOKEN_QUERY,
    });

    expect(errors).toBeUndefined();
    expect(data?.refreshToken).toBe("accessToken");
  });
  // logout query
  it("logs out successfully without error with logout query", async () => {
    const { errors } = await testServer.executeOperation({
      query: LOGOUT,
    });

    expect(errors).toBeUndefined();
  });
  // login query
  it("logs in successfully without error with login query", async () => {
    const { errors, data } = await testServer.executeOperation({
      query: USER_LOGIN,
      variables: {
        email: "irabeny89@ebbs.com",
        password: "ebbs2022",
      },
    });

    expect(errors).toBeUndefined();
    expect(data?.login);
  });
  // MUTATIONS
  // updateOrderItemStatus mutation
  it("updates user order status; non-nullable & return status from updateOrderItemStatus mutation", async () => {
    const { errors, data } = await testServer.executeOperation({
      query: UPDATE_ORDER_ITEM_STATUS,
      variables: {
        orderItemStatusArgs: {
          status: "SHIPPED",
          itemId: "1",
        },
      },
    });

    expect(errors).toBeUndefined();
    expect(data?.updateOrderItemStatus.includes("SHIPPED")).toBeTruthy();
    expect(data?.updateOrderItemStatus).not.toBeNull();
  });
  // delivery date update mutation
  it("sets the delivery date without error & return non-nullable value", async () => {
    const { errors, data } = await testServer.executeOperation({
      query: SET_ORDER_DELIVERY_DATE,
      variables: {
        orderId: "test_orderId_12345",
        deliveryDate: "test_deliveryDate",
      },
    });

    expect(errors).toBeUndefined();
    expect(data?.setOrderDeliveryDate).toBeTruthy();
  });
});
