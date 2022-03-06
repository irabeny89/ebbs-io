import { handleError } from "@/utils/index";

describe("handleError", () => {
  const failedErrorMessage = "failed";
  it("throws error when condition is true", () => {
    try {
      handleError(true, Error, failedErrorMessage);
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(failedErrorMessage);
    }
  });
  it("no error when condition is false", () =>
    handleError(false, Error, failedErrorMessage));
});
