import { searchList } from "../..//utils/";
import { testList } from "mockData";

describe("searchList", () => {
  const testList2 = testList.map((item, i) => ({
    ...item,
    title: "test title " + i,
    category: "cat" + i,
  }));
  it("finds an item(case-insensitive) with provided name exact match", () => {
    const resultList = searchList(testList, "A0"),
      caseInsensitiveResult = searchList(testList, "a0");

    expect(resultList).toHaveLength(1);
    expect(resultList[0]).toHaveProperty("name", "A0");
    expect(caseInsensitiveResult[0]).toHaveProperty("name", "A0");
  });

  it("finds all items(case-insensitive) with provided name substring", () => {
    const resultList = searchList(testList, "A"),
      caseInsensitiveResult = searchList(testList, "a");

    expect(resultList).toHaveLength(testList.length);
    expect(caseInsensitiveResult).toHaveLength(testList.length);
  });

  it("finds items(case-insensitive) with provided tag exact match", () => {
    const resultList = searchList(testList, "tag10"),
      caseInsensitiveResult = searchList(testList, "TAG10");

    expect(resultList).toHaveLength(1);
    expect(caseInsensitiveResult).toHaveLength(1);
  });
  it("does not return tags substring in search", () => {
    const resultList = searchList(testList, "tag"),
      caseInsensitiveResult = searchList(testList, "TAG");

    expect(resultList).toHaveLength(0);
    expect(caseInsensitiveResult).toHaveLength(0);
  });

  it("finds an item(case-insensitive) with provided title exact match", () => {
    const resultList = searchList(testList2, "test title 0"),
      caseInsensitiveResult = searchList(testList2, "TesT TiTle 0");

    expect(resultList).toHaveLength(1);
    expect(resultList[0]).toHaveProperty("title", "test title 0");
    expect(caseInsensitiveResult[0]).toHaveProperty("title", "test title 0");
  });

  it("finds all items(case-insensitive) with provided name substring", () => {
    const resultList = searchList(testList2, "title"),
      caseInsensitiveResult = searchList(testList2, "TiTle");

    expect(resultList).toHaveLength(testList.length);
    expect(caseInsensitiveResult).toHaveLength(testList.length);
  });

  it("finds items with category search texts(case-insensitive)", () => {
    const resultList = searchList(testList2, "cat"),
      caseInsensitiveResult = searchList(testList2, "CAT");

    expect(resultList).toHaveLength(5);
    expect(caseInsensitiveResult).toHaveLength(5);
  });

  it("finds items with category search texts(case-insensitive) exact match", () => {
    const resultList = searchList(testList2, "cat0"),
      caseInsensitiveResult = searchList(testList2, "CAT0");

    expect(resultList).toHaveLength(1);
    expect(caseInsensitiveResult).toHaveLength(1);
  });
});
