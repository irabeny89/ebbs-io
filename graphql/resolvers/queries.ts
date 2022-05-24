import {
  DirectMessagerType,
  GraphContextType,
  GroupedMessageType,
  InboxMessageType,
  JwtPayload,
  MessageType,
  MyMessageType,
  PagingInputType,
  ProductVertexType,
  UserLoginVariableType,
  UserPayloadType,
  UserType,
} from "types";
import config from "config";
import {
  authUser,
  comparePassword,
  devErrorLogger,
  getAuthPayload,
  getCursorConnection,
  handleError,
  setCookie,
} from "utils/";
import { ApolloError, AuthenticationError } from "apollo-server-micro";
import { randomBytes } from "crypto";

const {
  appData: {
    constants: { COOKIE_CLEAR_OPTIONS, COOKIE_PASSCODE_TOKEN },
    generalErrorMessage,
    title: ebbsTitle,
    passCodeDuration,
    abbr,
  },
  environmentVariable: { jwtRefreshSecret },
} = config;

const Query = {
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
      ).verify(cookies.token, jwtRefreshSecret) as JwtPayload & UserPayloadType;

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
  inbox: async (
    _: any,
    { args }: Record<"args", PagingInputType>,
    {
      req: {
        headers: { authorization },
      },
      MessageModel,
    }: GraphContextType
  ) => {
    try {
      // authenticate and get id or throw error
      const { sub } = getAuthPayload(authorization!);
      // filter direct messages by receiver id i.e target my messages
      const list = await MessageModel.find({
        $or: [{ receiver: sub }, { sender: sub }],
      })
        .populate("sender")
        .lean()
        .exec();
      // return message connection
      return getCursorConnection({ list, ...args });
    } catch (error) {
      // NOTE: log to debug
      devErrorLogger(error);
      handleError(error, AuthenticationError, generalErrorMessage);
    }
  },
  directMessagers: async (
    _: any,
    __: any,
    {
      req: {
        headers: { authorization },
      },
      MessageModel,
    }: GraphContextType
  ) => {
    try {
      // authenticate and get id or throw error
      const { sub } = getAuthPayload(authorization!);

      const sentMessages = (await MessageModel.find({ sender: sub })
        .populate("receiver")
        .lean()
        .exec()) as unknown as MyMessageType[];

      const inboxMessages = (await MessageModel.find({ receiver: sub })
        .populate("sender")
        .lean()
        .exec()) as unknown as InboxMessageType[];

      // @ts-ignore
      const senderMessagers: DirectMessagerType[] = inboxMessages.reduce(
        // @ts-ignore
        (oldData: DirectMessagerType[], { sender }, _, sentMessages) =>
          oldData.find(({ username }) => username === sender.username)
            ? oldData
            : [
                ...oldData,
                {
                  _id: sender._id,
                  username: sender.username,
                  unSeenCount: sentMessages.filter(
                    ({ isSeen, sender: { username } }) =>
                      username === sender.username && isSeen === false
                  ).length,
                  isSender: true,
                },
              ],
        []
      );

      // @ts-ignore
      const recipientMessagers: DirectMessagerType[] = sentMessages.reduce(
        // @ts-ignore
        (oldData: DirectMessagerType[], { receiver }, _, sentMessages) =>
          oldData.find(({ username }) => username === receiver.username)
            ? oldData
            : [
                ...oldData,
                {
                  _id: receiver._id,
                  username: receiver.username,
                  unSeenCount: sentMessages.filter(
                    ({ isSeen, receiver: { username } }) =>
                      username === receiver.username && isSeen === false
                  ).length,
                  isSender: false,
                },
              ],
        []
      );

      return senderMessagers.concat(recipientMessagers);
    } catch (error) {
      devErrorLogger(error);
      handleError(error, AuthenticationError, generalErrorMessage);
    }
  },
};

export default Query;
