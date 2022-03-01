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
import dbConnection from "@/mongoose/mongodb";
import sendEmail from "../node-mailer";
import resolvers from "./resolvers";
import { ApolloServer } from "apollo-server-micro";
import type { GraphContextType } from "types";
import typeDefs from "./typeDefs";

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
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
      sendEmail,
    };
  },
});

export default apolloServer;
