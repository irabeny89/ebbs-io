import {
  authUser,
  devErrorLogger,
  getAuthPayload,
  getHashedPassword,
  handleError,
  setCookie,
} from "utils/";
import {
  ChangePasswordVariableType,
  GraphContextType,
  OrderType,
  ProductType,
  RegisterVariableType,
  ServiceUpdateVariableType,
  StatusType,
} from "types";
import {
  ApolloError,
  AuthenticationError,
  ForbiddenError,
  UserInputError,
} from "apollo-server-micro";
import config from "config";

const {
  appData: {
    constants: { COOKIE_PASSCODE_TOKEN, COOKIE_CLEAR_OPTIONS },
    generalErrorMessage,
    maxProductAllowed,
  },
} = config;

const Mutation = {
  register: async (
    _: any,
    {
      registerInput: { passCode, password, username, ...serviceData },
    }: RegisterVariableType,
    { UserModel, ServiceModel, res, req: { cookies } }: GraphContextType
  ) => {
    const USER_INPUT_ERROR =
      "Inputs invalid! Verify or get another passcode and try again.";
    try {
      // decode and retrieve payload
      const email = (await import("jsonwebtoken")).verify(
        cookies.passCodeToken,
        passCode
      );
      // if user exists throw error
      handleError(
        await UserModel.findOne({ email }).select("email").lean().exec(),
        UserInputError,
        USER_INPUT_ERROR
      ),
        // password length < 8 throws error
        handleError(password.length < 8, UserInputError, USER_INPUT_ERROR);
      // create user
      const { id, username: _username } = await UserModel.create({
        email,
        username,
        ...(await getHashedPassword(password)),
      });
      // clear cookie
      setCookie(res, COOKIE_PASSCODE_TOKEN, "", COOKIE_CLEAR_OPTIONS);
      // create service for user & return access token
      return authUser(
        {
          audience: "user",
          id,
          username: _username,
          serviceId: (
            await ServiceModel.create([{ ...serviceData, owner: id }])
          )[0].id,
        },
        res
      ).accessToken;
    } catch (error: any) {
      // log error to console
      devErrorLogger(error);
      error.name === "UserInputError" &&
        handleError(error, UserInputError, USER_INPUT_ERROR);
      handleError(error, ApolloError, generalErrorMessage);
    }
  },
  changePassword: async (
    _: any,
    { newPassword, passCode }: ChangePasswordVariableType,
    { UserModel, req: { cookies }, res }: GraphContextType
  ): Promise<string | undefined> => {
    try {
      const user = await UserModel.findOneAndUpdate(
        {
          email: (
            await import("jsonwebtoken")
          ).verify(cookies.passCodeToken, passCode),
        },
        {
          $set: { ...(await getHashedPassword(newPassword)) },
        }
      )
        .select("username")
        .lean()
        .exec();
      // clear cookie
      setCookie(res, COOKIE_PASSCODE_TOKEN, "", COOKIE_CLEAR_OPTIONS);

      return `${user?.username} password changed successfully. Login with new password.`;
    } catch (error) {
      devErrorLogger(error);
      handleError(
        error,
        ForbiddenError,
        "Failed! Get a new passcode and try again."
      );
    }
  },
  myServiceUpdate: async (
    _: any,
    {
      args: serviceUpdate,
    }: Record<"args", Partial<ServiceUpdateVariableType["serviceUpdate"]>>,
    {
      ServiceModel,
      req: {
        headers: { authorization },
      },
    }: GraphContextType
  ): Promise<string | undefined> => {
    try {
      // this prevents overwriting; you can only update existing
      serviceUpdate.logoCID || delete serviceUpdate.logoCID;
      await ServiceModel.findByIdAndUpdate(
        getAuthPayload(authorization!).serviceId,
        {
          $set: serviceUpdate,
        }
      )
        .select("_id")
        .lean()
        .exec();
      return "Service updated successfully";
    } catch (error) {
      // NOTE: log error to debug
      devErrorLogger(error);
      handleError(error, AuthenticationError, generalErrorMessage);
    }
  },
  newProduct: async (
    _: any,
    { args }: Record<"args", Omit<ProductType, "provider">>,
    {
      ProductModel,
      req: {
        headers: { authorization },
      },
    }: GraphContextType
  ): Promise<string | undefined> => {
    try {
      // validate request auth
      const { serviceId } = getAuthPayload(authorization!);
      // throw error if user has no service profile
      if (!serviceId)
        throw new ForbiddenError("Create service before adding product!");
      // throw error if user products is over max allowed
      if (
        (
          await ProductModel.find({
            provider: serviceId,
          })
            .select("_id")
            .lean()
            .exec()
        ).length <= maxProductAllowed
      )
        // create product & return id
        return (
          await ProductModel.create({
            ...args,
            provider: serviceId,
          })
        ).id;
      else
        throw new ForbiddenError(
          "You have maximum products allowed. Kindly upgrade to add more products."
        );
    } catch (error: any) {
      // NOTE: log to debug
      devErrorLogger(error);
      handleError(
        error.code === 11000,
        UserInputError,
        "Product name already exist."
      );
      handleError(error, AuthenticationError, generalErrorMessage);
    }
  },
  deleteMyProduct: async (
    _: any,
    { productId }: Record<"productId", string>,
    {
      ProductModel,
      req: {
        headers: { authorization },
      },
    }: GraphContextType
  ): Promise<string | undefined> => {
    try {
      // check permission before delete
      getAuthPayload(authorization!);
      await ProductModel.findByIdAndDelete(productId)
        .select("_id")
        .lean()
        .exec();
      return "Product deleted successfully";
    } catch (error) {
      // NOTE: log error to debug
      devErrorLogger(error);
      handleError(error, AuthenticationError, generalErrorMessage);
    }
  },
  myCommentPost: async (
    _: any,
    args: Record<"serviceId" | "post", string>,
    {
      CommentModel,
      req: {
        headers: { authorization },
      },
    }: GraphContextType
  ): Promise<string | undefined> => {
    try {
      // check permission or throw error
      await CommentModel.create([
        {
          topic: args.serviceId,
          post: args.post,
          poster: getAuthPayload(authorization!).sub,
        },
      ]);
      return "Comment posted successfully";
    } catch (error) {
      // NOTE: log to debug
      devErrorLogger(error);
      handleError(error, AuthenticationError, generalErrorMessage);
    }
  },
  myFavService: async (
    _: any,
    args: { serviceId: string; isFav: boolean },
    {
      LikeModel,
      req: {
        headers: { authorization },
      },
    }: GraphContextType
  ): Promise<boolean | undefined> => {
    try {
      const { sub } = getAuthPayload(authorization!);
      await LikeModel.findOneAndUpdate(
        { selection: args.serviceId },
        args.isFav
          ? {
              $addToSet: { happyClients: sub },
            }
          : { $pull: { happyClients: sub } },
        { upsert: true }
      )
        .select("_id")
        .lean()
        .exec();

      return args.isFav;
    } catch (error) {
      // NOTE: log to debug
      devErrorLogger(error);
      handleError(error, AuthenticationError, generalErrorMessage);
    }
  },
  serviceOrder: async (
    _: any,
    {
      args,
    }: Record<
      "args",
      Pick<
        OrderType,
        "items" | "phone" | "state" | "address" | "nearestBusStop"
      >
    >,
    {
      OrderModel,
      req: {
        headers: { authorization },
      },
    }: GraphContextType
  ): Promise<string | undefined> => {
    try {
      // check user permission
      const { sub } = getAuthPayload(authorization!);
      await OrderModel.create({
        ...args,
        client: sub,
        totalCost: args.items.reduce((prev, item) => prev + item.cost, 0),
      });
      return "Order created successfully";
    } catch (error) {
      // NOTE: log error to debug
      devErrorLogger(error);
      handleError(error, AuthenticationError, generalErrorMessage);
    }
  },
  updateOrderItemStatus: async (
    _: any,
    {
      args: { status, itemId },
    }: {
      args: {
        itemId: string;
        status: StatusType;
      };
    },
    {
      OrderModel,
      req: {
        headers: { authorization },
      },
    }: GraphContextType
  ): Promise<string | undefined> => {
    try {
      // check user permission
      getAuthPayload(authorization!);
      await OrderModel.findOneAndUpdate(
        { "items._id": itemId },
        {
          $set: {
            items: (
              await OrderModel.findOne({ "items._id": itemId })
                .select("items")
                .lean()
                .exec()
            )?.items.map((item) =>
              item._id?.toString() === itemId
                ? {
                    ...item,
                    status,
                  }
                : item
            ),
          },
        }
      )
        .select("_id")
        .lean()
        .exec();

      return `status is now ${status}`;
    } catch (error) {
      // NOTE: log to debug
      devErrorLogger(error);
      handleError(error, AuthenticationError, generalErrorMessage);
    }
  },
  setOrderDeliveryDate: async (
    _: any,
    { orderId, deliveryDate }: Record<"deliveryDate" | "orderId", string>,
    {
      OrderModel,
      req: {
        headers: { authorization },
      },
    }: GraphContextType
  ) => {
    try {
      // check permission
      getAuthPayload(authorization!);
      // update order delivery date
      await OrderModel.findByIdAndUpdate(orderId, {
        $set: { deliveryDate },
      });
      // return confirmation string
      return "Delivery date has been set successfully";
    } catch (error) {
      // NOTE: log to debug error
      devErrorLogger(error);
      handleError(error, AuthenticationError, generalErrorMessage);
    }
  },
};

export default Mutation;
