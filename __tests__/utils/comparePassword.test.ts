import { comparePassword, hashPassword } from "@/utils/index";

describe("comparePassword", () => {
  const { password, salt } = { password: "password", salt: "salt" }
  let hashedPassword: string
  beforeEach(async () => {
    hashedPassword = (await hashPassword(password, salt))!
  })
  it("returns true when password are equal", async () => 
    expect(
      await comparePassword(hashedPassword, password, salt)
    ).toBeTruthy());
  it("returns false when password are not equal", async () =>
    expect(
      await comparePassword(
        (await hashPassword(password, salt))!,
        "wrong_password",
        salt
      )
    ).toBeFalsy());
    it("returns undefined if password & salt are undefined", async () => {
      
      expect(
        await comparePassword(
          (await hashPassword(undefined!, undefined!))!,
          "password",
          undefined!
        )
      ).toBeUndefined()
    })
});
