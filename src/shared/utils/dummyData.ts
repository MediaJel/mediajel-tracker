const dummyData = () => {
    const dummyData1 = [{
        cart: 1,
        id: "1234",
        total: 100,
        tax: 10,
        shipping: 5,
        city: "New York",
        state: "NY",
        country: "USA",
        currency: "USD",
        items: [
            {
                sku: "123",
                name: "Product 1",
                category: "Category 1",
                unitPrice: 10,
                quantity: 1,
            }
        ]
    }];

    const dummyData2 = [{
        cart: 2,
        id: "5678",
        total: 50,
        tax: 5,
        shipping: 7,
        city: "Largo",
        state: "Florida",
        country: "USA",
        currency: "USD",
        items: [
            {
                sku: "123",
                name: "Product 3",
                category: "Category 3",
                unitPrice: 10,
                quantity: 1,
            }
        ]
    }];

    // const randomizer = Math.random() < 0.5 ? dummyData1 : dummyData2;
    // const dummyDataValue = { randomizer, dummyData1, dummyData2 };
    const randomizer = dummyData2;
    const dummyDataValue = randomizer;
    return dummyDataValue;
}

export default dummyData;