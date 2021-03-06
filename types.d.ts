import mongoose, { Model } from "mongoose";
import { NextApiRequest, NextApiResponse } from "next";
import Mail from "nodemailer/lib/mailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

type JwtPayload = {
  [key: string]: any;
  iss?: string | undefined;
  sub?: string | undefined;
  aud?: string | string[] | undefined;
  exp?: number | undefined;
  nbf?: number | undefined;
  iat?: number | undefined;
  jti?: string | undefined;
};

type UserPayloadType = {
  serviceId?: string;
  username: string;
  audience: "admin" | "user";
  id: string;
};

type StatusType = "DELIVERED" | "PENDING" | "SHIPPED" | "CANCELED";

type TokenPairType = {
  accessToken: string;
  refreshToken: string;
};

type ProductCategoryType =
  | "WEARS"
  | "ELECTRICALS"
  | "VEHICLES"
  | "ELECTRONICS"
  | "FOOD_DRUGS"
  | "PETS"
  | "SOFTWARES"
  | "ARTS"
  | "EDUCATION";

type TimestampAndId = {
  _id: string | mongoose.Types.ObjectId;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type StyleType = {
  className?: string;
  style?: CSSProperties;
};

type UserType = {
  role: "ADMIN" | "USER";
  username: string;
  email: string;
  password: string;
  salt: string;
} & TimestampAndId;

type ServiceType = {
  owner: mongoose.Types.ObjectId | string;
  title: string;
  logoCID: string;
  description: string;
  state: string;
  maxProduct: number;
} & TimestampAndId;

type ProductType = {
  name: string;
  description: string;
  category: ProductCategoryType;
  imagesCID: string;
  videoCID?: string;
  tags?: string[];
  price: number;
  provider: mongoose.Types.ObjectId;
} & TimestampAndId;

type OrderItemType = {
  _id?: mongoose.Types.ObjectId | string;
  productId: string | mongoose.Types.ObjectId;
  providerId: string | mongoose.Types.ObjectId;
  providerTitle: string;
  name: string;
  price: number;
  quantity: number;
  cost: number;
  status?: StatusType;
};

type OrderStatsType = Record<
  "PENDING" | "SHIPPED" | "DELIVERED" | "CANCELED",
  number
>;

type OrderType = {
  client: mongoose.Types.ObjectId | string;
  items: OrderItemType[];
  phone: string;
  state: string;
  address: string;
  nearestBusStop: string;
  deliveryDate: Date;
  totalCost: number;
} & TimestampAndId;

type LikeType = {
  selection: mongoose.Types.ObjectId;
  happyClients: mongoose.Types.ObjectId[];
} & TimestampAndId;

type CommentType = {
  topic: mongoose.Types.ObjectId;
  poster: mongoose.Types.ObjectId;
  post: string;
} & TimestampAndId;

type DepositOrWithdrawType = {
  amount: number;
  user: string | mongoose.Types.ObjectId;
  aggregate: number;
} & TimestampAndId;

type MessageType = {
  message: string;
  sender: mongoose.Types.ObjectId | string;
  receiver: mongoose.Types.ObjectId | string;
  isSeen: boolean;
} & TimestampAndId;

type DirectMessagerType = {
  _id: string;
  username: string;
  unSeenSentCount: number;
  unSeenReceivedCount: number;
};

type MyMessageType = Omit<MessageType, "receiver"> &
  Record<"receiver", UserType>;

type InboxMessageType = Omit<MessageType, "sender"> &
  Record<"sender", UserType>;

type CreditOrDebitType = Omit<DepositType, "user"> &
  Record<"from" | "to", DepositType["user"]> & {
    type: "purchase" | "transfer";
  };

type ProductVertexType = Partial<
  Omit<ProductType, "provider"> & {
    saleCount: number;
    provider: ServiceVertexType;
  }
>;

type ServiceVertexType = Partial<
  Omit<ServiceType, "owner"> & {
    happyClients: (string | mongoose.Types.ObjectId)[];
    products: CursorConnectionType<ProductVertexType>;
    comments: CursorConnectionType<CommentVertexType>;
    orders: CursorConnectionType<OrderVertexType>;
    categories: [ProductCategoryType];
    commentCount: number;
    productCount: number;
    orderCount: number;
    likeCount: number;
  }
>;

type CommentVertexType = Partial<{
  topic: ServiceVertexType;
  poster: UserVertexType;
}> &
  Omit<CommentType, "topic" | "poster">;

type UserVertexType = Partial<
  Pick<UserType, "username" | "email"> & {
    service: ServiceVertexType;
    requests: CursorConnectionType<OrderVertexType>;
    requestCount: number;
  }
> &
  TimestampAndId;

type OrderVertexType = Partial<Omit<OrderType, "client">> & {
  client: UserVertexType;
  orderStats: OrderStatsType;
};

type MessageVertexType = Partial<
  Omit<MessageType, "sender"> & Record<"sender", UserVertexType>
>;

type PaginationInfoType = {
  totalPages: number;
  totalItems: number;
  page: number;
  perPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

type CursorConnectionType<NodeType> = {
  edges: EdgeType<NodeType>[];
  pageInfo: PageInfoType;
};

type EdgeType<NodeType> = {
  cursor: Date | string;
  node: NodeType;
};

type PageInfoType = {
  startCursor: Date | string;
  endCursor: Date | string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

type PagingInputType = Partial<{
  first: number;
  after: Date | string;
  last: number;
  before: Date | string;
  search: string;
}>;

type CursorConnectionArgsType<T> = Record<"list", T[]> & PagingInputType;

type RegisterVariableType = Record<
  "registerInput",
  Pick<UserType, "username" | "password"> &
    Partial<Pick<ServiceType, "title" | "logo" | "description" | "state">> &
    Record<"passCode", string>
>;

type UserLoginVariableType = Record<"email" | "password", string>;

type ServiceReturnType = Record<
  "services",
  CursorConnectionType<ServiceVertexType>
>;

type ServiceVariableType = Record<
  "commentArgs" | "productArgs" | "serviceArgs",
  PagingInputType
>;

type ChangePasswordVariableType = Record<"passCode" | "newPassword", string>;

type ServiceUpdateVariableType = Record<
  "serviceUpdate",
  Pick<ServiceType, "title" | "description" | "logoCID" | "state">
>;

type NewProductVariableType = Record<
  "newProduct",
  Omit<ProductType, "provider">
>;

type GraphContextType = {
  UserModel: Model<UserType>;
  ServiceModel: Model<ServiceType>;
  CommentModel: Model<CommentType>;
  OrderModel: Model<OrderType>;
  ProductModel: Model<ProductType>;
  LikeModel: Model<LikeType>;
  DepositModel: Model<DepositOrWithdrawType>;
  WithdrawModel: Model<DepositOrWithdrawType>;
  DebitModel: Model<CreditOrDebitType>;
  CreditModel: Model<CreditOrDebitType>;
  MessageModel: Model<MessageType>;
  req: NextApiRequest;
  res: NextApiResponse;
  sendEmail: (
    emailOptions: Mail.Options
  ) => Promise<
    SMTPTransport.SentMessageInfo &
      Record<"testAccountMessageUrl", string | false>
  >;
};

type AjaxFeedbackProps = {
  loading?: boolean;
  error?: any;
  text?: string;
} & StyleType;
