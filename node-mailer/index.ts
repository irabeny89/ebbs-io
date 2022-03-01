import config from "../config";
import {
  createTestAccount,
  createTransport,
  getTestMessageUrl,
} from "nodemailer";
import Mail from "nodemailer/lib/mailer";

export const isDevEnv = process.env.NODE_ENV === "development";

const {
  environmentVariable: {
    ebbsEmailHost,
    ebbsEmailPort,
    ebbsPassword,
    ebbsUsername,
  },
} = config;

const sendEmail = async (emailOptions: Mail.Options) => {
  const { smtp, user, pass } = await createTestAccount(),
    // email transporter config
    transportOptions = {
      host: process.env.NODE_ENV === "production" ? ebbsEmailHost : smtp.host,
      port: process.env.NODE_ENV === "production" ? ebbsEmailPort : smtp.port,
      secure: process.env.NODE_ENV === "production",
      auth: {
        user: process.env.NODE_ENV === "production" ? ebbsUsername : user,
        pass: process.env.NODE_ENV === "production" ? ebbsPassword : pass,
      },
    },
    // send and get response info
    info = await createTransport(transportOptions).sendMail(emailOptions);
  // return the result & message url of test account after sending mail
  return { ...info, testAccountMessageUrl: getTestMessageUrl(info) };
};

export default sendEmail