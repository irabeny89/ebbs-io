import { randomBytes } from "crypto";
import config from "../config";
import { verify, JwtPayload } from "jsonwebtoken";
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
  PassCodeDataType,
} from "types";
import {
  authUser,
  comparePassword,
  devErrorLogger,
  getAuthPayload,
  getCursorConnection,
  getHash,
  getHashedPassword,
  handleError,
  setCookie,
  verifyPassCodeData,
} from "../utils";
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
    constants: { COOKIE_PASSCODE, COOKIE_CLEAR_OPTIONS },
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
      setCookie(res, "token", "", {
        maxAge: 0,
        httpOnly: true,
        sameSite: true,
        secure: process.env.NODE_ENV === "production"
      }),
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
        handleError(!user, AuthenticationError, "Authentication failed!");
        // if user exist validate password
        // then authenticate user & return token
        return (
          (await comparePassword(user?.password!, password, user?.salt!)) &&
          authUser(
            {
              audience: "USER",
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
          ).accessToken
        );
      } catch (error) {
        // NOTE: log error to debug
        devErrorLogger(error);
        handleError(error, AuthenticationError, generalErrorMessage);
      }
    },
    refreshToken: async (
      _: any,
      __: any,
      {
        req: {
          cookies: { token },
        },
        res,
      }: GraphContextType
    ) => {
      try {
        // verify refresh token
        const { aud, sub, username, serviceId } = verify(
          token,
          jwtRefreshSecret
        ) as JwtPayload & UserPayloadType;
        // re-auth user & return token
        return authUser(
          {
            id: sub!,
            audience: aud as "ADMIN" | "USER",
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
        const passCode = randomBytes(8).toString("hex");
        // store hash in user cookie
        setCookie(
          res,
          COOKIE_PASSCODE,
          {
            email,
            hashedPassCode: getHash(passCode),
          },
          {
            maxAge: passCodeDuration * 60,
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
          }
        );
        // send email and log link for test account
        console.log(
          `test email link: ${
            (
              await sendEmail({
                from: `${ebbsTitle}`,
                to: email,
                subject: `${abbr} Pass Code`,
                html: `<h1>${ebbsTitle}</h1>
        <h2>Pass Code: ${passCode}</h2>
        <p>It expires in ${passCodeDuration} minutes</p>`,
              })
            ).testAccountMessageUrl
          }`
        );

        return "Passcode sent to your email successfully";
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
                await ProductModel.find().lean().exec()
              ).map(async (item) => ({
                ...item,
                saleCount:
                  (
                    await OrderModel.findById(item._id)
                      .$where("status == SHIPPED")
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
      try {
        // verify & get email from cookies
        const { passCodeData } = cookies as unknown as Record<
            "passCodeData",
            PassCodeDataType
          >,
          email = verifyPassCodeData(passCodeData, passCode);
        // if user exist throw error or password length < 8
        handleError(
          await UserModel.findOne({ email }).select("email").lean().exec(),
          AuthenticationError,
          "User already exist"
        ),
          handleError(
            password.length < 8,
            UserInputError,
            "Password should be 8 or more characters"
          );
        // else create user
        const { id, username: _username } = (
          await UserModel.create([
            { email, username, ...(await getHashedPassword(password)) },
          ])
        )[0];
        // clear passCodeData from cookies since it is no more needed
        // create service for user
        // return access token
        return (
          setCookie(res, COOKIE_PASSCODE, "", COOKIE_CLEAR_OPTIONS),
          authUser(
            {
              audience: "USER",
              id,
              username: _username,
              serviceId: (
                await ServiceModel.create([{ ...serviceData, owner: id }])
              )[0].id,
            },
            res
          ).accessToken
        );
      } catch (error: any) {
        // NOTE: log error to debug
        ["ForbiddenError"].includes(error.name) &&
          handleError(
            error,
            ForbiddenError,
            "Something happened. Get a new passcode and try again."
          );
        devErrorLogger(error);
        handleError(error, AuthenticationError, generalErrorMessage);
      }
    },
    changePassword: async (
      _: any,
      { newPassword, passCode }: ChangePasswordVariableType,
      { UserModel, req: { cookies }, res }: GraphContextType
    ): Promise<string | undefined> => {
      try {
        // throws error if passCodeData is undefined.
        // if no error then update the user password
        // clear passcode data from cookies
        // return successful message
        return (
          await UserModel.findOneAndUpdate(
            // @ts-ignore
            { email: verifyPassCodeData(cookies.passCodeData, passCode) },
            {
              $set: { password: newPassword },
            }
          )
            .select("_id")
            .lean()
            .exec(),
          setCookie(res, COOKIE_PASSCODE, COOKIE_CLEAR_OPTIONS),
          "Password changed successfully."
        );
      } catch (error) {
        // NOTE: log error to debug
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
      { args: serviceUpdate }: Record<"args", ServiceUpdateVariableType>,
      {
        ServiceModel,
        req: {
          headers: { authorization },
        },
      }: GraphContextType
    ): Promise<string | undefined> => {
      try {
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
        handleError(error.code === 11000, UserInputError, "Product name already exist.")
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
        res
      }: GraphContextType
    ): Promise<string | undefined> => {
      try {
        // check permission before delete
        getAuthPayload(authorization!);
        await ProductModel.findByIdAndDelete(productId)
          .select("_id")
          .lean()
          .exec();
          // regenerate static home page
          res.unstable_revalidate("/")
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
            : { $pull: { happyClients: sub } }
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
          await UserModel.findById(parent._id)
            .select("username")
            .lean()
            .exec()
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
      __: any,
      { LikeModel }: GraphContextType
    ) => {
      try {
        return (
          await LikeModel.findOne({
            selection: parent._id,
          })
            .select("happyClients")
            .lean()
            .exec()
        )?.happyClients!;
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
                  .lean()
                  .exec()
              ).map(async (item) => ({
                ...item,
                saleCount:
                  (
                    await OrderModel.findById(item._id)
                      .$where("status == SHIPPED")
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
          await ProductModel.find({ provider: _id })
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
          await LikeModel.findOne({ selection: parent._id })
            .select("happyClients")
            .lean()
            .exec()
        )?.happyClients.length;
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
}

export default resolvers