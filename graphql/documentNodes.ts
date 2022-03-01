import { gql } from "apollo-server-micro";
// fragments
export const PRODUCT_FRAGMENT = gql`
    fragment ProductFields on ServiceProduct {
      _id
      name
      description
      category
      imagesCID
      videoCID
      tags
      price
      saleCount
    }
  `,
  SERVICE_FRAGMENT = gql`
    fragment ServiceFields on UserService {
      _id
      title
      logoCID
      description
      state
      happyClients
      likeCount
      categories
      commentCount
    }
  `,
  PAGING_FRAGMENT = gql`
    fragment PageInfoFields on PaginationInfo {
      totalPages
      totalItems
      page
      perPage
      hasNextPage
      hasPreviousPage
    }
  `,
  COMMENT_FRAGMENT = gql`
    fragment CommentFields on ServiceComment {
      _id
      topic {
        title
      }
      post
      poster {
        username
      }
      createdAt
    }
  `,
  ORDER_FRAGMENT = gql`
    fragment OrderFields on ServiceOrder {
      _id
      client {
        username
      }
      items {
        _id
        name
        price
        quantity
        cost
        status
        productId
        providerId
        providerTitle
      }
      orderStats {
        PENDING
        CANCELED
        SHIPPED
        DELIVERED
      }
      phone
      state
      address
      nearestBusStop
      deliveryDate
      totalCost
      createdAt
    }
  `;

// query operations
export const REFRESH_TOKEN_QUERY = gql`
  query RefreshToken {
    refreshToken
  }
`;

export const USER_LOGIN = gql`
  query UserLogin($email: String!, $password: String!) {
    login(email: $email, password: $password)
  }
`;

export const USER_REQUEST_PASSCODE = gql`
  query RequestPassCode($email: String!) {
    requestPassCode(email: $email)
  }
`;

export const SERVICE = gql`
  ${PRODUCT_FRAGMENT}
  ${SERVICE_FRAGMENT}
  query UserService(
    $serviceId: ID!
    $productArgs: PagingInput!
    $commentArgs: PagingInput!
  ) {
    service(serviceId: $serviceId) {
      ...ServiceFields
      products(args: $productArgs) {
        edges {
          node {
            ...ProductFields
            provider {
              _id
              title
            }
          }
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
      comments(args: $commentArgs) {
        edges {
          node {
            _id
            post
            poster {
              username
            }
            createdAt
          }
        }
      }
    }
  }
`;

export const SERVICE_LIKE_DATA = gql`
  query ServiceLikeData($serviceId: ID!, $commentArgs: PagingInput!) {
    service(serviceId: $serviceId) {
      happyClients
      likeCount
      commentCount
      comments(args: $commentArgs) {
        edges {
          node {
            _id
            post
            poster {
              username
            }
            createdAt
          }
        }
      }
    }
  }
`;

export const SERVICE_PRODUCT = gql`
  ${PRODUCT_FRAGMENT}
  query ServiceProducts($productArgs: PagingInput!, $serviceId: ID!) {
    service(serviceId: $serviceId) {
      products(args: $productArgs) {
        edges {
          node {
            ...ProductFields
            provider {
              _id
              title
            }
          }
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }
  }
`;

export const FEW_SERVICES = gql`
  ${PRODUCT_FRAGMENT}
  ${SERVICE_FRAGMENT}
  query FewServices(
    $serviceArgs: PagingInput!
    $productArgs: PagingInput!
    $commentArgs: PagingInput!
  ) {
    services(args: $serviceArgs) {
      edges {
        node {
          ...ServiceFields
          products(args: $productArgs) {
            edges {
              node {
                ...ProductFields
                provider {
                  _id
                  title
                }
              }
            }
          }
          comments(args: $commentArgs) {
            edges {
              node {
                _id
                post
                poster {
                  username
                }
                createdAt
              }
            }
          }
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;

export const FEW_PRODUCTS_AND_SERVICES = gql`
  ${PRODUCT_FRAGMENT}
  query FewProductsAndServices(
    $productArgs: PagingInput!
    $serviceArgs: PagingInput!
    $serviceProductArgs: PagingInput!
  ) {
    products(args: $productArgs) {
      edges {
        node {
          ...ProductFields
          provider {
            _id
            title
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
    services(args: $serviceArgs) {
      edges {
        node {
          _id
          title
          logoCID
          description
          state
          categories
          products(args: $serviceProductArgs) {
            edges {
              node {
                ...ProductFields
                provider {
                  _id
                  title
                }
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const FEW_PRODUCTS = gql`
  ${PRODUCT_FRAGMENT}
  query Products($args: PagingInput!) {
    products(args: $args) {
      edges {
        node {
          ...ProductFields
          provider {
            _id
            title
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const MY_PROFILE = gql`
  ${PRODUCT_FRAGMENT}
  ${COMMENT_FRAGMENT}
  ${ORDER_FRAGMENT}
  query MyProfile(
    $productArgs: PagingInput!
    $commentArgs: PagingInput!
    $orderArgs: PagingInput!
    $requestArgs: PagingInput!
  ) {
    me {
      _id
      username
      email
      requestCount
      requests(args: $requestArgs) {
        edges {
          node {
            ...OrderFields
          }
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
      service {
        _id
        title
        logoCID
        description
        state
        happyClients
        productCount
        orderCount
        commentCount
        maxProduct
        categories
        products(args: $productArgs) {
          edges {
            node {
              ...ProductFields
              provider {
                _id
                title
              }
            }
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
        comments(args: $commentArgs) {
          edges {
            node {
              ...CommentFields
            }
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
        orders(args: $orderArgs) {
          edges {
            node {
              ...OrderFields
            }
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
        updatedAt
      }
      createdAt
    }
  }
`;

export const MY_ORDERS = gql`
  ${ORDER_FRAGMENT}
  query OrderList($orderArgs: PagingInput!) {
    myOrders(args: $orderArgs) {
      edges {
        node {
          ...OrderFields
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;

export const MY_REQUESTS = gql`
  ${ORDER_FRAGMENT}
  query RequestList($requestArgs: PagingInput!) {
    myRequests(args: $requestArgs) {
      edges {
        node {
          ...OrderFields
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;

export const MY_PRODUCTS = gql`
  ${PRODUCT_FRAGMENT}
  query MyProducts($productArgs: PagingInput!) {
    myProducts(args: $productArgs) {
      edges {
        node {
          ...ProductFields
          provider {
            _id
            title
          }
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;

export const LOGOUT = gql`
  query UserLogOut {
    logout
  }
`;

// mutation operations
export const USER_REGISTER = gql`
  mutation register($registerInput: RegisterInput!) {
    register(registerInput: $registerInput)
  }
`;

export const USER_PASSWORD_CHANGE = gql`
  mutation PasswordChange($passCode: String!, $newPassword: String!) {
    changePassword(passCode: $passCode, newPassword: $newPassword)
  }
`;

export const UPDATE_ORDER_ITEM_STATUS = gql`
  mutation UpdateOrderItemStatus($orderItemStatusArgs: OrderItemStatusInput!) {
    updateOrderItemStatus(args: $orderItemStatusArgs)
  }
`;

export const ADD_NEW_PRODUCT = gql`
  mutation AddNewProduct($newProduct: NewProductInput!) {
    newProduct(args: $newProduct)
  }
`;

export const DELETE_MY_PRODUCT = gql`
  mutation DeleteMyProduct($productId: ID!) {
    deleteMyProduct(productId: $productId)
  }
`;

export const MY_FAV_SERVICE = gql`
  mutation ServiceLikeToggle($serviceId: ID!, $isFav: Boolean!) {
    myFavService(serviceId: $serviceId, isFav: $isFav)
  }
`;

export const SERVICE_ORDER = gql`
  mutation ServiceOrder($serviceOrderInput: ServiceOrderInput!) {
    serviceOrder(args: $serviceOrderInput)
  }
`;

export const MY_COMMENT = gql`
  mutation MyComment($serviceId: ID!, $post: String!) {
    myCommentPost(serviceId: $serviceId, post: $post)
  }
`;

export const MY_SERVICE_UPDATE = gql`
  mutation MyServiceUpdate($serviceUpdate: MyServiceUpdateInput!) {
    myServiceUpdate(args: $serviceUpdate)
  }
`;

export const SET_ORDER_DELIVERY_DATE = gql`
  mutation SetOrderDeliveryDate($orderId: ID!, $deliveryDate: String!) {
    setOrderDeliveryDate(orderId: $orderId, deliveryDate: $deliveryDate)
  }
`;
