import { randomBytes } from "crypto";
import config from "../../config";
import type {
  ChangePasswordVariableType,
  CommentType,
  GraphContextType,
  OrderType,
  PagingInputType,
  ProductCategoryType,
  ProductType,
  ProductVertexType,
  ServiceType,
  ServiceUpdateVariableType,
  UserLoginVariableType,
  UserPayloadType,
  RegisterVariableType,
  UserType,
  OrderStatsType,
  StatusType,
  JwtPayload,
} from "types";
import {
  authUser,
  comparePassword,
  devErrorLogger,
  getAuthPayload,
  getCursorConnection,
  getHashedPassword,
  handleError,
  setCookie,
} from "../../utils";
import {
  AuthenticationError,
  UserInputError,
  ForbiddenError,
  ApolloError,
} from "apollo-server-micro";

const {
  environmentVariable: { jwtRefreshSecret },
  appData: {
    generalErrorMessage,
    title: ebbsTitle,
    passCodeDuration,
    abbr,
    maxProductAllowed,
    constants: { COOKIE_PASSCODE_TOKEN, COOKIE_CLEAR_OPTIONS },
  },
} = config;

export const getOrderItemStats = (orderItems: any[]): OrderStatsType =>
  orderItems.reduce(
    (prev, { status }) => ({ ...prev, [status]: ++prev[status] }),
    {
      PENDING: 0,
      CANCELED: 0,
      SHIPPED: 0,
      DELIVERED: 0,
    }
  );

const resolvers = {
  Query: {
    hello: () => "world!",
    logout: (_: any, __: any, { res }: GraphContextType) => (
      setCookie(res, "token", "", COOKIE_CLEAR_OPTIONS),
      "Logged out successfully."
    ),
    login: async (
      _: any,
      { email, password }: UserLoginVariableType,
      { UserModel, ServiceModel, res }: GraphContextType
    ) => {
      try {
        // find user
        const user = await UserModel.findOne({ email })
          .select("password salt username serviceId")
          .lean()
          .exec();
        // throw error if user does not exist
        handleError(!user, AuthenticationError, "User not found on database");
        // if user exist validate password
        handleError(
          !(await comparePassword(user?.password!, password, user?.salt!)),
          AuthenticationError,
          "Passwords do not match."
        );
        // then authenticate user & return token
        return authUser(
          {
            audience: "user",
            id: user?._id?.toString()!,
            username: user?.username!,
            serviceId: (
              await ServiceModel.findOne({ owner: user?._id })
                .select("_id")
                .lean()
                .exec()
            )?._id?.toString(),
          },
          res
        ).accessToken;
      } catch (error) {
        // NOTE: log error to debug
        devErrorLogger(error);
        handleError(error, AuthenticationError, generalErrorMessage);
      }
    },
    refreshToken: async (
      _: any,
      __: any,
      { req: { cookies }, res }: GraphContextType
    ) => {
      try {
        // verify refresh token
        const { aud, sub, username, serviceId } = (
          await import("jsonwebtoken")
        ).verify(cookies.token, jwtRefreshSecret) as JwtPayload &
          UserPayloadType;

        // re-auth user & return token
        return authUser(
          {
            id: sub!,
            audience: aud as UserPayloadType["audience"],
            username,
            serviceId,
          },
          res
        ).accessToken;
      } catch (error) {
        // log error for more
        devErrorLogger(error);
        handleError(error, AuthenticationError, generalErrorMessage);
      }
    },
    requestPassCode: async (
      _: any,
      { email }: { email: string },
      { sendEmail, res }: GraphContextType
    ) => {
      try {
        // generate pass code
        const passCode = randomBytes(2).toString("hex");
        // store hash in user cookie
        setCookie(
          res,
          COOKIE_PASSCODE_TOKEN,
          (await import("jsonwebtoken")).sign(email, passCode),
          {
            maxAge: passCodeDuration * 60,
            httpOnly: true,
            sameSite: "none",
            secure: true,
          }
        );
        // send passcode to email and console.log test account link
        return (
          process.env.OFFLINE!
            ? console.log(passCode)
            : console.log(
                `test email link: ${
                  (
                    await sendEmail({
                      from: `${ebbsTitle}`,
                      to: email,
                      subject: `${abbr} Pass Code`,
                      html: `<h2>${ebbsTitle}</h2>
        <h3>Pass Code: ${passCode}</h3>
        <p>It expires in ${passCodeDuration} minutes</p>`,
                    })
                  ).testAccountMessageUrl
                }`
              ),
          "Check your email."
        );
      } catch (error) {
        // NOTE: log error to debug
        devErrorLogger(error);
        handleError(error, ApolloError, generalErrorMessage);
      }
    },
    service: async (
      _: any,
      { serviceId }: { serviceId: string },
      { ServiceModel }: GraphContextType
    ) => {
      try {
        return await ServiceModel.findById(serviceId).lean().exec();
      } catch (error) {
        // NOTE: log to debug
        devErrorLogger(error);
        handleError(error, Error, generalErrorMessage);
      }
    },
    services: async (
      _: any,
      { args }: Record<"args", PagingInputType>,
      { ServiceModel }: GraphContextType
    ) => {
      try {
        return getCursorConnection({
          list: await ServiceModel.find().lean().exec(),
          ...args,
        });
      } catch (error) {
        // NOTE: log error to debug
        devErrorLogger(error);
        handleError(error, Error, generalErrorMessage);
      }
    },
    products: async (
      _: any,
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
                await ProductModel.find().populate("provider").lean().exec()
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
        // NOTE: log error to debug
        devErrorLogger(error);
        handleError(error, Error, generalErrorMessage);
      }
    },
    myOrders: async (
      _: any,
      { args }: Record<"args", PagingInputType>,
      {
        OrderModel,
        req: {
          headers: { authorization },
        },
      }: GraphContextType
    ) => {
      try {
        return getCursorConnection({
          list: await OrderModel.find({
            provider: getAuthPayload(authorization!).serviceId,
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
    myRequests: async (
      _: any,
      { args }: Record<"args", PagingInputType>,
      {
        OrderModel,
        req: {
          headers: { authorization },
        },
      }: GraphContextType
    ) => {
      try {
        return getCursorConnection({
          list: await OrderModel.find({
            client: getAuthPayload(authorization!).serviceId,
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
    me: async (
      _: any,
      __: any,
      {
        req: {
          headers: { authorization },
        },
        UserModel,
      }: GraphContextType
    ) => {
      try {
        return await UserModel.findById(getAuthPayload(authorization!).sub)
          .lean()
          .exec();
      } catch (error) {
        // NOTE: log to debug
        devErrorLogger(error);
        handleError(error, AuthenticationError, generalErrorMessage);
      }
    },
  },
  Mutation: {
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
  },
  User: {
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
  },
  UserService: {
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
            (await CommentModel.find({ topic: parent._id }).lean().exec()) ??
            [],
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
  },
  ServiceOrder: {
    orderStats: ({ items }: OrderType) => getOrderItemStats(items),
  },
};

export default resolvers;
