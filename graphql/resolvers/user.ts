import {
  devErrorLogger,
  getAuthPayload,
  handleError,
  getCursorConnection,
} from "utils/";
import { GraphContextType, PagingInputType, UserType } from "types";
import config from "config";
import { AuthenticationError } from "apollo-server-micro";

const {
  appData: { generalErrorMessage },
} = config;

const User = {
  username: async (
    parent: UserType,
    _: any,
    { UserModel }: GraphContextType
  ) => {
    try {
      return (
        await UserModel.findById(parent._id).select("username").lean().exec()
      )?.username;
    } catch (error) {
      // NOTE: log to debug
      devErrorLogger(error);
      handleError(error, Error, generalErrorMessage);
    }
  },
  requests: async (
    parent: UserType,
    { args }: Record<"args", PagingInputType>,
    { OrderModel }: GraphContextType
  ) => {
    try {
      return getCursorConnection({
        list: await OrderModel.find({
          client: parent._id,
        })
          .lean()
          .exec(),
        ...args,
      });
    } catch (error) {
      // NOTE: log to debug
      devErrorLogger(error);
      handleError(error, Error, generalErrorMessage);
    }
  },
  service: async (
    _: any,
    __: any,
    {
      req: {
        headers: { authorization },
      },
      ServiceModel,
    }: GraphContextType
  ) => {
    try {
      return await ServiceModel.findById(
        getAuthPayload(authorization!).serviceId
      )
        .lean()
        .exec();
    } catch (error) {
      // NOTE: log to debug
      devErrorLogger(error);
      handleError(error, AuthenticationError, generalErrorMessage);
    }
  },
  requestCount: async (
    parent: UserType,
    _: any,
    { OrderModel }: GraphContextType
  ) => {
    try {
      return (
        await OrderModel.find({ client: parent._id })
          .select("_id")
          .lean()
          .exec()
      ).length;
    } catch (error) {
      // NOTE: log error to debug
      devErrorLogger(error);
      handleError(error, AuthenticationError, generalErrorMessage);
    }
  },
};

export default User;
