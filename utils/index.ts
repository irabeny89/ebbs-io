import { randomBytes, scrypt, BinaryLike, timingSafeEqual, createHash } from "crypto";
import { AuthenticationError, ForbiddenError } from "apollo-server-micro";
import { promisify } from "util";
import { serialize, CookieSerializeOptions } from "cookie";
import { NextApiResponse } from "next";
import {
  CursorConnectionArgsType,
  CursorConnectionType,
  PassCodeDataType,
  TokenPairType,
  UserPayloadType,
} from "types";
import { JwtPayload, Secret, sign, SignOptions, verify } from "jsonwebtoken";
import config from "../config";

export const isDevEnv = process.env.NODE_ENV === "development";

const {
  environmentVariable: {
    jwtAccessSecret,
    jwtRefreshSecret,
    nodeEnvironment,
    ebbsEmailHost,
    ebbsEmailPort,
    ebbsPassword,
    ebbsUsername,
    host,
  },
} = config;

export const AUTHORIZATION_ERROR_MESSAGE = "Authorization failed";

export const LOGIN_ERROR_MESSAGE = "Enter correct email and password";

export const setCookie = (
  res: NextApiResponse,
  name: string,
  value: unknown,
  options: CookieSerializeOptions = {}
) => {
  const stringValue =
    typeof value === "object" ? "j:" + JSON.stringify(value) : String(value);
  if ("maxAge" in options) {
    options.expires = new Date(Date.now() + options.maxAge!);
    options.maxAge! /= 1000;
  }
  res.setHeader("Set-Cookie", serialize(name, String(stringValue), options));
};

export const getHashedPassword = async (password: string) => {
  const salt = randomBytes(32).toString("hex");

  return {
    salt,
    password: await hashPassword(password, salt),
  };
};

const asyncScrypt = promisify<BinaryLike, BinaryLike, number, Buffer>(scrypt);

export const handleError = (
  condition: any,
  ErrorClass: any,
  message: string
) => {
  if (condition) throw new ErrorClass(message);
};
// verifies jwt and throw errors
export const getAuthPayload = (authorization: string) =>
  verify(authorization!.replace("Bearer ", ""), jwtAccessSecret) as JwtPayload &
    Omit<UserPayloadType, "id">;

const hashPassword = async (password: string, salt: string) =>
  (await asyncScrypt(password, salt, 64)).toString("hex");

export const comparePassword = async (
  hashedPassword: string,
  password: string,
  salt: string
) => {
  const isValid = timingSafeEqual(
    Buffer.from(hashedPassword),
    Buffer.from(await hashPassword(password, salt))
  );
  handleError(
    !isValid,
    AuthenticationError,
    AUTHORIZATION_ERROR_MESSAGE + " - Invalid email or password"
  );

  return isValid;
};
// check admin user
export const isAdminUser = (accessToken: string) => {
  try {
    const payload = verify(accessToken, jwtAccessSecret) as JwtPayload &
      Omit<UserPayloadType, "id">;

    return payload.aud === "ADMIN";
  } catch (error) {
    handleError(error, AuthenticationError, AUTHORIZATION_ERROR_MESSAGE);
  }
};

// utility function to generate a signed token
const generateToken = (
  payload: string | object | Buffer,
  secretOrPrivateKey: Secret,
  options?: SignOptions | undefined
) => {
  try {
    return sign(payload, secretOrPrivateKey, options);
  } catch (error) {
    // log error to debug
    throw new AuthenticationError(AUTHORIZATION_ERROR_MESSAGE);
  }
};

// generate access & refresh token
const createTokenPair = ({
  audience,
  username,
  serviceId,
  id,
}: UserPayloadType): TokenPairType => ({
  accessToken: generateToken({ username, serviceId }, jwtAccessSecret, {
    subject: id,
    expiresIn: "20m",
    audience,
    issuer: host,
    algorithm: "HS256",
  }),
  refreshToken: generateToken({ username, serviceId }, jwtRefreshSecret, {
    subject: id,
    expiresIn: "30d",
    audience,
    issuer: host,
    algorithm: "HS256",
  }),
});

// generate access & refresh token while safely storing refresh token in cookie for later use
export const authUser = (payload: UserPayloadType, res: NextApiResponse) => {
  const tokenPair = createTokenPair(payload);
  // 30 days refresh token in the cookie
  setCookie(res, "token", tokenPair.refreshToken, {
    maxAge: 2592000000,
    httpOnly: true,
    sameSite: "lax",
    secure: nodeEnvironment === "production" ?? false,
    path: "/api/graphql",
  });

  return tokenPair;
};

export const searchList = <
  T extends Array<
    Record<"createdAt", Date | string> & {
      title?: string;
      name?: string;
      tags?: string[];
      category?: string;
    }
  >
>(
  list: T,
  searchText: string
) =>
  list.filter(
    (item) =>
      item?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      item?.category?.toLowerCase().includes(searchText.toLowerCase()) ||
      item?.tags
        ?.map((item) => item.toLowerCase())
        .includes(searchText.toLowerCase()) ||
      item?.title?.toLowerCase().includes(searchText.toLowerCase())
  );

export const getCursorConnection = <
  T extends Record<"createdAt", Date | string> & {
    title?: string;
    name?: string;
    tags?: string[];
  }
>({
  list,
  first,
  after,
  last,
  before,
  search,
}: CursorConnectionArgsType<T>): CursorConnectionType<T> => {
  let edges: {
      cursor: Date | string;
      node: T;
    }[] = [],
    startCursor: Date | string = new Date(),
    endCursor: Date | string = new Date(),
    hasNextPage: boolean = false,
    hasPreviousPage: boolean = false;
  // if search is requested...
  const _list = search
    ? // ..then check items with name, tags or title fields & return the list
      (searchList(list, search) as typeof list)
    : list;

  if (first) {
    const afterIndex = _list.findIndex((item) => item.createdAt === after);
    // create edges with cursor
    edges = _list.slice(afterIndex + 1, first + afterIndex + 1).map((item) => ({
      cursor: item.createdAt,
      node: item,
    }));
    // paging info
    startCursor = edges[0]?.node?.createdAt ?? "";
    endCursor = edges.reverse()[0]?.node?.createdAt ?? "";
    hasNextPage = _list.some((item) => item.createdAt > endCursor);
    hasPreviousPage = list.some((item) => item.createdAt < startCursor);
  }
  if (last) {
    const beforeIndex = _list.findIndex((item) => item.createdAt === before);
    // create edges with cursor
    edges = _list
      .slice(
        (beforeIndex === -1 ? 0 : beforeIndex) - last,
        beforeIndex === -1 ? undefined : beforeIndex
      )
      .map((item) => ({
        cursor: item.createdAt,
        node: item,
      }));
    // paging info
    startCursor = edges[0]?.node?.createdAt ?? "";
    endCursor = edges.reverse()[0]?.node?.createdAt ?? "";
    hasNextPage = _list.some((item) => item.createdAt > endCursor);
    hasPreviousPage = _list.some((item) => item.createdAt < startCursor);
  }
  return {
    edges: edges.reverse(),
    pageInfo: { startCursor, endCursor, hasPreviousPage, hasNextPage },
  };
};

export const devErrorLogger = (error: any) =>
  isDevEnv &&
  (console.log("===================================="),
  console.log(error),
  console.log("===================================="));

  export const getHash = (data: string) => createHash("sha256").update(data).digest("hex")

  export const verifyPassCodeData = ({
    email, hashedPassCode
  }: PassCodeDataType, passCode: string) => {
    // throws error when passCodeData or hashedPassCode is undefined.
    // throw error if passcode is invalid
    handleError(
      !timingSafeEqual(Buffer.from(passCode), Buffer.from(hashedPassCode)),
      ForbiddenError,
      "Failed! Get a new passcode and try again."
    );

    return email
  }