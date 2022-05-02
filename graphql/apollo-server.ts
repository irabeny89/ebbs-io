import {
  ApolloServerPluginLandingPageGraphQLPlayground,
  ApolloServerPluginLandingPageDisabled,
} from "apollo-server-core";
import UserModel from "@/mongoose/models/userModel";
import ServiceModel from "@/mongoose/models/serviceModel";
import ProductModel from "@/mongoose/models/productModel";
import CommentModel from "@/mongoose/models/commentModel";
import LikeModel from "@/mongoose/models/likeModel";
import OrderModel from "@/mongoose/models/orderModel";
import DepositModel from "@/mongoose/models/depositModel";
import WithdrawModel from "@/mongoose/models/withdrawModel";
import DebitModel from "@/mongoose/models/debitModel";
import CreditModel from "@/mongoose/models/creditModel";
import MessageModel from "@/mongoose/models/messageModel";
import dbConnection from "@/mongoose/mongodb";
import sendEmail from "../node-mailer";
import { ApolloServer } from "apollo-server-micro";
import type { GraphContextType } from "types";
import typeDefs from "./typeDefs";
import Query from "./resolvers/queries";
import Mutation from "./resolvers/mutations";
import User from "./resolvers/user";
import UserService from "./resolvers/userService";
import ServiceOrder from "./resolvers/serviceOrder";

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers: {
    Query,
    Mutation,
    User,
    UserService,
    ServiceOrder,
  },
  plugins: [
    process.env.NODE_ENV === "production"
      ? ApolloServerPluginLandingPageDisabled()
      : ApolloServerPluginLandingPageGraphQLPlayground(),
  ],
  context: async ({
    req,
    res,
  }: Pick<GraphContextType, "req" | "res">): Promise<GraphContextType> => {
    await dbConnection();
    return {
      req,
      res,
      UserModel,
      CommentModel,
      OrderModel,
      ProductModel,
      ServiceModel,
      LikeModel,
      DepositModel,
      WithdrawModel,
      DebitModel,
      CreditModel,
      MessageModel,
      sendEmail,
    };
  },
});

export default apolloServer;
