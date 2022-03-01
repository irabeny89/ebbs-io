import { randomInt } from "crypto";

type UsernameType =
  | "incubatingGenius"
  | "irabeny"
  | "maryK"
  | "isaJagaban"
  | "itty"
  | "kzLompo"
  | "calebnitz"
  | "izzy-miyaki"
  | "pasitar"
  | "awoof-dey";
type MockFieldType = "username" | "email" | "commentPost" | "productName" | "serviceTitle";

const usernames = [
    "incubatingGenius",
    "irabeny",
    "maryK",
    "isaJagaban",
    "itty",
    "kzLompo",
    "calebnitz",
    "izzy-miyaki",
    "pasitar",
    "awoof-dey",
  ],
  emails = usernames.map((username) =>
    Array.from({ length: 2 }).reduce(
      (prev: string, _, i) =>
        prev
          .substring(randomInt(prev.length - 1), randomInt(prev.length - 1))
          .replace("-", prev) +
        `${prev.substring(
          randomInt(prev.length - 1),
          randomInt(prev.length - 1)
        )}` +
        `${randomInt(1e2)}` +
        `${i === 1 ? "@enymail.com" : ""}`,
      username
    )
  ),
  products = [
    "Gold Earrings",
    "Nike Shoe",
    "Sony PlayStation 4",
    "Toyota Camry",
    "Ferrari F430 Sport",
    "Ferrari Scuderia Sport",
    "Nestle Milo 550G",
    'LCD Television 45"',
    "Xiaomi Note 10",
    "Samsung Galaxy S20 Ultra",
  ],
  serviceTitles = [
    "Adeinca Empire",
    "Exotic Drinks",
    "Eshologe Jewelry",
    "Mary Human Hair",
    "Luxurious Cars International",
    "Joshat Computer World",
    "Dukadan Oil & Gas Home Delivery",
    "Jara Nigeria Limited",
    "Valjizy Jewelry",
    "Valjizy Art World",
  ],
  commentPosts = [
    "The product is good. I would like to buy in bulk.",
    "The servie is ok. The product is awesome too. I recommend.",
    "I am hoping my package arrive early like the last one. ;)",
    "Well, the price is affordable. I recommend.",
    "Do you waybill?",
    "Interstate delivery can be discussed on phone call.",
    "This product is expensive but it is also worth it.",
    "I like the product.",
    "I didn't believe it would be as smooth and easy as this. Wow, kudos.",
    "Is there a sample for us testers? ;)"
  ]

const getEmailFor = (username: string, domain = "enymail.com") =>
  `${username + "@" + domain}`;

export const getMockField = (field: MockFieldType) =>
  field === "username"
    ? usernames[randomInt(usernames.length)]
    : field === "email"
    ? emails[randomInt(emails.length)]
    : field === "productName"
    ? products[randomInt(products.length)]
    : field === "serviceTitle"
    ? serviceTitles[randomInt(serviceTitles.length)]
    : field === "commentPost" ? commentPosts[randomInt(commentPosts.length)] : undefined;
