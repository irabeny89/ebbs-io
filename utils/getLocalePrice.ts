const getLocalePrice = (price: number) =>
  "\u20a6 " + price.toLocaleString("en-US", { maximumFractionDigits: 2 });

export default getLocalePrice;
