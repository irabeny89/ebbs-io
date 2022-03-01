import { gql } from "apollo-server-micro"

const typeDefs = gql`
# -- query --
type Query {
  "Hello world test"
  hello: String!
  "refresh auth token"
  refreshToken: String!
  "fields of a single service by id"
  service(serviceId: ID!): UserService
  "list of all service nodes"
  services(args: PagingInput!): ServiceConnection!
  "list of all product nodes"
  products(args: PagingInput!): ProductConnection!
  "list of products belonging to an authorized & authenticated user"
  myProducts(args: PagingInput!): ProductConnection!
  "list of orders belonging to an authorized & authenticated user"
  myOrders(args: PagingInput!): OrderConnection!
  "list of my requests belonging to an authorized & authenticated user"
  myRequests(args: PagingInput!): OrderConnection!
  "user login"
  login(email: String!, password: String!): String!
  "log user out"
  logout: String!
  "user profile data"
  me: User
  "request passcode to change password"
  requestPassCode(email: String!): String!
}
# -- mutation --
type Mutation {
  "register new user"
  register(registerInput: RegisterInput!): String!
  "resetPassword with passcode"
  changePassword(passCode: String!, newPassword: String!): String!
  "like a service using the service ID and select action"
  myFavService(serviceId: ID!, isFav: Boolean!): Boolean!
  "send purchase request; creates new order"
  serviceOrder(args: ServiceOrderInput!): String!
  "set order status; updates order status"
  updateOrderItemStatus(args: OrderItemStatusInput!): String!
  "new product creation"
  newProduct(args: NewProductInput!): String!
  "delete product by an authorized user"
  deleteMyProduct(productId: ID!): String!
  "as an authorized user post comment on a service using it id"
  myCommentPost(serviceId: ID!, post: String!): String!
  "update service by an authorized user"
  myServiceUpdate(args: MyServiceUpdateInput!): String!
  "set the order delivery date"
  setOrderDeliveryDate(orderId: ID!, deliveryDate: String!): String!
}

# -- inputs --
input OrderItemStatusInput {
  status: StatusOptions!
  itemId: ID!
}

input ServiceOrderInput {
  items: [OrderItemInput!]!
  phone: String!
  state: String!
  address: String!
  nearestBusStop: String!
}

input OrderItemInput {
  productId: ID!
  providerId: ID!
  providerTitle: String!
  name: String!
  price: Float!
  quantity: Int!
  cost: Float!
}

input UserPasswordChangeInput {
  "The new password"
  newPassword: String!
  "The old password"
  oldPassword: String!
}

input NewProductInput {
  "The new product name"
  name: String!
  "The new product description"
  description: String!
  "The new product image(s) web3 content ID"
  imagesCID: String!
  "The new product video web3 content ID"
  videoCID: String
  "The new product category type"
  category: CategoryOption!
  "The new product tag(s)"
  tags: [String]
  "The new product price"
  price: Float!
}

input RegisterInput {
  username: String!
  email: String!
  password: String!
  title: String
  logoCID: String
  description: String
  state: String
}

input MyServiceUpdateInput {
  logoCID: String
  description: String
  state: String
  title: String
}

input UserUpdateInput {
  "user phone number"
  phone: String
  "resident state"
  state: String
  "resident country"
  country: String
  "business logo"
  logoCID: String
  "business description"
  description: String
  "business label"
  label: String
}

input PagingInput {
  # forward paging count
  first: Int
  # forward paging after this cursor eg endCursor
  after: String
  # backward paging count
  last: Int
  # backward paging befor this cursor eg startCursor"
  before: String
  # search text
  search: String
}
# -- enumerations --
enum CategoryOption {
  WEARS
  ELECTRICALS
  VEHICLES
  ELECTRONICS
  FOOD_DRUGS
}

enum StatusOptions {
  PENDING
  SHIPPED
  DELIVERED
  CANCELED
}

enum RequestStatusOption {
  DELIVERED
  CANCELED
}

enum OrderStatusOption {
  CANCELED
  SHIPPED
}

enum AudienceOptions {
  ADMIN
  USER
}
# -- paging object types --
# the pagination object
type PageInfo {
  "the start cursor of a list"
  startCursor: String!
  "the end cursor of a list"
  endCursor: String!
  "the next page indicator when moving forward in a list"
  hasNextPage: Boolean!
  "the previous page indicator when moving backwards in a list"
  hasPreviousPage: Boolean!
}

type CommentConnection {
  edges: [CommentEdge!]!
  pageInfo: PageInfo!
}

type CommentEdge {
  cursor: String!
  node: ServiceComment!
}

type OrderConnection {
  edges: [OrderEdge!]!
  pageInfo: PageInfo!
}

type OrderEdge {
  cursor: String!
  node: ServiceOrder!
}

type ProductConnection {
  edges: [ProductEdge!]!
  pageInfo: PageInfo!
}

type ProductEdge {
  cursor: String!
  node: ServiceProduct!
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
}

type UserEdge {
  cursor: String!
  node: User!
}

type ServiceEdge {
  cursor: String!
  node: UserService!
}

type ServiceConnection {
  edges: [ServiceEdge!]!
  pageInfo: PageInfo!
}

type SearchPayload {
  products(args: PagingInput!): ProductConnection!
  services(args: PagingInput!): ServiceConnection!
}
# -- vertices/nodes --
# user object type
type User {
  _id: ID!
  "the user's alias"
  username: String!
  "the user's email"
  email: String!
  "user products requests"
  requests(args: PagingInput!): OrderConnection!
  "total number of user request"
  requestCount: Int!
  "the user's service"
  service: UserService
  "product creation date"
  createdAt: String!
  "product modification date"
  updatedAt: String!
}
# service object type
type UserService {
  _id: ID
  "the service name"
  title: String
  "the service logo"
  logoCID: String
  "service description"
  description: String
  "service home state"
  state: String
  "number of likes for the service"
  likeCount: Int
  "number of users who likes the service"
  happyClients: [ID!]
  "list of service products"
  products(args: PagingInput!): ProductConnection!
  "comments from clients"
  comments(args: PagingInput!): CommentConnection!
  "service orders from clients"
  orders(args: PagingInput!): OrderConnection!
  "all product categories"
  categories: [CategoryOption]
  "max product allowed per service"
  maxProduct: Int
  "the total number of orders per service"
  orderCount: Int
  "the total number of products per service"
  productCount: Int
  "the total number of comments per service"
  commentCount: Int
  "product creation date"
  createdAt: String
  "product modification date"
  updatedAt: String
}
# comment object type
type ServiceComment {
  _id: ID!
  "the service commented on"
  topic: UserService!
  "the client who posted the comment"
  poster: User!
  "the comment post"
  post: String!
  "product creation date"
  createdAt: String!
  "product modification date"
  updatedAt: String!
}
# product object type
type ServiceProduct {
  _id: ID!
  "the product name"
  name: String!
  "the product description"
  description: String!
  "the product category"
  category: CategoryOption!
  "the product images"
  imagesCID: String!
  "the product video clip - optional"
  videoCID: String
  "the related names for the product"
  tags: [String]!
  "the product price"
  price: Float!
  "the product sales count"
  saleCount: Int!
  "the service the product belongs to"
  provider: UserService!
  "product creation date"
  createdAt: String!
  "product modification date"
  updatedAt: String!
}
# order item object type
type OrderItem {
  "order item object id"
  _id: ID!
  "The product ID"
  productId: ID!
  "The service provider ID; the product owner"
  providerId: ID!
  "The provider/service name/title"
  providerTitle: String!
  "The ordered product name"
  name: String!
  "The ordered product price at the time"
  price: Float!
  "The quantity ordered per item"
  quantity: Int!
  "The cost of the item(s) - price * quantity"
  cost: Float!
  "The item delivery status - delivered, pending, canceled or shipped"
  status: StatusOptions!
}
# order stats object type
type OrderStats {
  "Total number of pending item statuses within an order"
  PENDING: Int!
  "Total number of canceled item statuses within an order"
  CANCELED: Int!
  "Total number of shipped item statuses within an order"
  SHIPPED: Int!
  "Total number of delivered item statuses within an order"
  DELIVERED: Int!
}
# order object type
type ServiceOrder {
  _id: ID!
  "the user who placed the order"
  client: User!
  "aggregated count of order statuses"
  orderStats: OrderStats!
  "The items ordered by the client"
  items: [OrderItem!]!
  "The client phone number to call"
  phone: String!
  "The client home state"
  state: String!
  "The client address"
  address: String!
  "The client nearest bus stop"
  nearestBusStop: String!
  "The delivery date specified by the service provider"
  deliveryDate: String
  "the items total cost"
  totalCost: Float!
  "product creation date"
  createdAt: String!
  "product modification date"
  updatedAt: String!
}
`

export default typeDefs