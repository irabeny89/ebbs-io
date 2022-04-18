import { devErrorLogger, handleError, getCursorConnection } from "utils/";
import {
  CommentType,
  GraphContextType,
  OrderType,
  PagingInputType,
  ProductCategoryType,
  ProductVertexType,
  ServiceType,
} from "types";
import config from "config";
import { AuthenticationError } from "apollo-server-micro";

const {
  appData: { generalErrorMessage },
} = config;

const UserService = {
  happyClients: async (
    parent: ServiceType,
    _: any,
    { LikeModel }: GraphContextType
  ) => {
    try {
      return (
        (
          await LikeModel.findOne({
            selection: parent._id,
          })
            .select("happyClients")
            .lean()
            .exec()
        )?.happyClients! ?? []
      );
    } catch (error) {
      // NOTE: log error to debug
      devErrorLogger(error);
      handleError(error, AuthenticationError, generalErrorMessage);
    }
  },
  products: async (
    parent: ServiceType,
    { args }: Record<"args", PagingInputType>,
    { ProductModel, OrderModel }: GraphContextType
  ) => {
    try {
      return getCursorConnection<
        Omit<ProductVertexType, "createdAt"> & {
          createdAt: Date | string;
          saleCount: number;
        }
      >({
        list:
          (await Promise.all(
            (
              await ProductModel.find({ provider: parent._id })
                .populate("provider")
                .lean()
                .exec()
            ).map(async (item) => ({
              ...item,
              saleCount:
                (
                  await OrderModel.find({
                    "items.productId": item._id,
                    "items.status": "DELIVERED",
                  })
                    .select("_id")
                    .lean()
                    .exec()
                )?.length ?? 0,
            }))
          )) ?? [],
        ...args,
      });
    } catch (error) {
      devErrorLogger(error);
      handleError(error, Error, generalErrorMessage);
    }
  },
  comments: async (
    parent: ServiceType,
    { args }: Record<"args", PagingInputType>,
    { CommentModel }: GraphContextType
  ) => {
    try {
      return getCursorConnection<CommentType>({
        list:
          (await CommentModel.find({ topic: parent._id }).lean().exec()) ?? [],
        ...args,
      });
    } catch (error) {
      // NOTE: log error to debug
      devErrorLogger(error);
      handleError(error, Error, generalErrorMessage);
    }
  },
  orders: async (
    { _id }: ServiceType,
    { args }: Record<"args", PagingInputType>,
    { OrderModel }: GraphContextType
  ) => {
    try {
      return getCursorConnection<OrderType>({
        list:
          (await OrderModel.find({ "items.providerId": _id })
            .populate("client")
            .lean()
            .exec()) ?? [],
        ...args,
      });
    } catch (error) {
      // NOTE: log error to debug
      devErrorLogger(error);
      handleError(error, Error, generalErrorMessage);
    }
  },
  categories: async (
    { _id }: ServiceType,
    _: any,
    { ProductModel }: GraphContextType
  ) => {
    try {
      return (
        await ProductModel.find({ provider: _id })
          .select("category")
          .lean()
          .exec()
      ).reduce(
        (prev: ProductCategoryType[], { category }) =>
          prev.includes(category) ? prev : [...prev, category],
        []
      );
    } catch (error) {
      // NOTE: log error to debug
      devErrorLogger(error);
      handleError(error, Error, generalErrorMessage);
    }
  },
  commentCount: async (
    { _id }: ServiceType,
    _: any,
    { CommentModel }: GraphContextType
  ) => {
    try {
      return (
        await CommentModel.find({ topic: _id }).select("_id").lean().exec()
      ).length;
    } catch (error) {
      // NOTE: log error to debug
      devErrorLogger(error);
      handleError(error, Error, generalErrorMessage);
    }
  },
  productCount: async (
    { _id }: ServiceType,
    _: any,
    { ProductModel }: GraphContextType
  ) => {
    try {
      return (
        await ProductModel.find({ provider: _id }).select("_id").lean().exec()
      ).length;
    } catch (error) {
      // NOTE: log error to debug
      devErrorLogger(error);
      handleError(error, Error, generalErrorMessage);
    }
  },
  orderCount: async (
    { _id }: ServiceType,
    _: any,
    { OrderModel }: GraphContextType
  ) => {
    try {
      return (
        await OrderModel.find({ "items.providerId": _id })
          .select("_id")
          .lean()
          .exec()
      ).length;
    } catch (error) {
      // NOTE: log error to debug
      devErrorLogger(error);
      handleError(error, Error, generalErrorMessage);
    }
  },
  likeCount: async (
    parent: ServiceType,
    _: any,
    { LikeModel }: GraphContextType
  ) => {
    try {
      return (
        (
          await LikeModel.findOne({ selection: parent._id })
            .select("happyClients")
            .lean()
            .exec()
        )?.happyClients.length ?? 0
      );
    } catch (error) {
      // NOTE: log error to debug
      devErrorLogger(error);
      handleError(error, Error, generalErrorMessage);
    }
  },
};

export default UserService;
