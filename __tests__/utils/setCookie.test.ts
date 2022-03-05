import { setCookie } from "@/utils/index";

jest.mock("cookie", () => ({
  serialize: jest.fn().mockReturnValue("token value"),
}));

describe("setCookie", () => {
  const { key, value } = { key: "token", value: "token value" },
    // mocked response object
    res = { setHeader: jest.fn() };

  // @ts-ignore
  setCookie(res, key, value),
    it("calls setHeader method of nextjs response object", () => {
      expect(res.setHeader).toHaveBeenCalled();
    }),
    it("calls setHeader with Set-Cookie header", () => {
      expect(res.setHeader).toBeCalledWith<[string, string]>(
        "Set-Cookie",
        value
      );
    });
});
