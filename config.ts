import { CookieSerializeOptions } from "cookie";

const isProductionEnv = process.env.NODE_ENV === "production",
  config = {
    appData: {
      author: "Ernest Irabor",
      title: "EBBS - EveryBodyBuySell",
      abbr: "EBBS",
      socialMedia: [{ name: "telegram", link: "https://t.me/ebbs2022" }],
      description:
        "EBBS - EveryBodyBuySell is a platform for everybody to create and manage their online businesses.",
      features: [
        "Easy to use dashboard to manage your online business.",
        "Manage your business logistics.",
        "Customer Relation Management through comments etc.",
        "Connect with other businesses.",
        "Monitor your orders.",
        "Join the Telegram channel below to share your thoughts.",
        "More features coming...",
      ],
      privacyTypes: ["ALL", "USER", "ADMIN"],
      testAccount: {
        email: "",
        password: "",
      },
      productCategories: [
        "WEARS",
        "ELECTRICALS",
        "VEHICLES",
        "ELECTRONICS",
        "FOOD_DRUGS",
      ],
      orderStatuses: ["PENDING", "SHIPPED", "DELIVERED", "CANCELED"],
      subscriptionInfos: [
        {
          type: "BUSINESS",
          costPerDay: 500,
        },
        {
          type: "PRODUCT",
          costPerDay: 500,
        },
      ],
      // time in minutes
      passCodeDuration: 10,
      maxProductAllowed: 12,
      passwordRecoveryOption: {
        subject: "EBBS - Password Recovery",
        from: "<no-reply>@gmail.com",
        body: "Hello, enter the access code to change your password on EBBS website - ",
      },
      generalErrorMessage:
        "Something went wrong. Check your internet or login or check your inputs and try again",
      constants: {
        AUTH_PAYLOAD: "authPayload",
        CART_ITEMS_KEY: "ebbsCartItems",
        COOKIE_PASSCODE: "passCodeData",
        COOKIE_CLEAR_OPTIONS: {
          maxAge: 0,
          httpOnly: true,
          sameSite: "lax",
          secure: true,
        } as CookieSerializeOptions,
      },
      webPages: [],
    },
    environmentVariable: {
      jwtAccessSecret: process.env.JWT_ACCESS_SECRET!,
      jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
      nodeEnvironment: process.env.NODE_ENV,
      dbUrl: isProductionEnv
        ? process.env.DB_URL_ATLAS!
        : process.env.DB_URL_COMPASS!,
      origins: [
        {
          name: "ebbs",
          origin: isProductionEnv
            ? "https://ebbs.vercel.app"
            : "http://localhost:3000",
        },
      ],
      host: isProductionEnv ? "https://ebbs-io.vercel.app" : "http://localhost:4000",
      graphqlUri: "/api/graphql",
      ebbsEmail: process.env.EBBS_EMAIL,
      ebbsUsername: process.env.EBBS_USERNAME,
      ebbsPassword: process.env.EBBS_PASSWORD,
      ebbsEmailHost: process.env.EBBS_EMAIL_HOST,
      ebbsEmailPort: +process.env.EBBS_EMAIL_PORT!,
      web3storageKey: process.env.NEXT_PUBLIC_WEB3_STORAGE_KEY,
    },
  };

export default config;
