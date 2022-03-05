import { MicroRequest } from "apollo-server-micro/dist/types";
import { NextApiResponse } from "next";
import apolloServer from "../../graphql/apollo-server";
import appConfig from "config";
import Cors from "micro-cors";

const {
  graphqlUri,
  origins: [{ origin }],
} = appConfig.environmentVariable;
const server = apolloServer.start();

export const config = { api: { bodyParser: false } };

export default Cors({
  allowHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "apollographql-client-name",
    "apollographql-client-version",
    "authorization",
  ],
  allowMethods: ["POST", "OPTIONS"],
  origin,
  // @ts-ignore
})(async (req: MicroRequest, res: NextApiResponse) => {
  if (req.method === "OPTIONS") {
    return res.send("ok");
  }
  await server;
  return await apolloServer.createHandler({
    path: graphqlUri,
  })(req, res);
});
