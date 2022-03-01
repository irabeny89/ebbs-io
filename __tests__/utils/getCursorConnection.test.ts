import { getCursorConnection } from "../../utils/";
import { testList } from "mockData";

describe("getCursorConnection", () => {
  it("should return cursor connection with first 1 item", () => {
    const { edges } = getCursorConnection({
      list: testList,
      first: 1,
    });

    expect(edges).toHaveLength(1);
    expect(edges[0].node).toHaveProperty("name", "A0");
  });

  it("should return cursor connection with first 2 items", () => {
    const { edges } = getCursorConnection({
      list: testList,
      first: 2,
    });

    expect(edges).toHaveLength(2);
    expect(edges[0].node).toHaveProperty("name", "A0");
    expect(edges[1].node).toHaveProperty("name", "A1");
  });

  it("should return cursor connection with first 2 items after the 3rd item", () => {
    const { edges } = getCursorConnection({
      list: testList,
      first: 2,
      after: testList[2].createdAt,
    });

    expect(edges).toHaveLength(2);
    expect(edges[0].node).toHaveProperty("name", "A3");
    expect(edges[1].node).toHaveProperty("name", "A4");
  });

  it("should return cursor connection with last 1 item", () => {
    const { edges } = getCursorConnection({
      list: testList,
      last: 1,
    });

    expect(edges).toHaveLength(1);
    expect(edges[0].node).toHaveProperty("name", "A4");
  });

  it("should return cursor connection with last 2 items", () => {
    const { edges } = getCursorConnection({
      list: testList,
      last: 2,
    });

    expect(edges).toHaveLength(2);
    expect(edges[0].node).toHaveProperty("name", "A3");
    expect(edges[1].node).toHaveProperty("name", "A4");
  });

  it("should return cursor connection with last 2 items before the 4th item", () => {
    const { edges } = getCursorConnection({
      list: testList,
      last: 2,
      before: testList[3].createdAt,
    });

    expect(edges).toHaveLength(2);
    expect(edges[0].node).toHaveProperty("name", "A1");
    expect(edges[1].node).toHaveProperty("name", "A2");
  });

  it("finds first 3 items with search text(case-insensitive) name substring", () => {
    const { edges } = getCursorConnection({
      list: testList,
      first: 3,
      search: "A",
    });

    expect(edges).toHaveLength(3);
    expect(edges[0].node.name).toBe("A0");
  });

  it("finds last 2 items with search text(case-insensitive) name substring", () => {
    const { edges } = getCursorConnection({
      list: testList,
      last: 2,
      search: "A",
    });

    expect(edges).toHaveLength(2);
    expect(edges[1].node.name).toBe("A4");
  });
});
