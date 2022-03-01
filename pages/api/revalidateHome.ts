import { devErrorLogger } from "@/utils/index";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  _: NextApiRequest, res: NextApiResponse
) {
  try {
    await res.unstable_revalidate("/");
    console.log('====================================');
    console.log("revalidated");
    console.log('====================================');
    return res.status(200).json({ revalidated: true });
  } catch (error: any) {
    // NOTE: log to debug
    devErrorLogger(error);
    return res.status(500).send("Error revalidating")
  }
}
