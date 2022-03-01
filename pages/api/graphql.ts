import { MicroRequest } from "apollo-server-micro/dist/types";
import { NextApiResponse } from "next";
import apolloServer from "../../graphql/apollo-server";
import appConfig from "config";
import Cors from "micro-cors";

const server = apolloServer.start();

export const config = { api: { bodyParser: false } };

export default Cors({
  allowCredentials: true,
  allowHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept"],
  allowMethods: ["POST", "OPTIONS"],
  origin: "http://localhost:3000/",
  // @ts-ignore
})(async (req: MicroRequest, res: NextApiResponse) => {
  if (req.method === "OPTIONS") {
    res.end();
    return false;
  }
  await server;
  return await apolloServer.createHandler({
    path: appConfig.environmentVariable.graphqlUri,
  })(req, res);
});
