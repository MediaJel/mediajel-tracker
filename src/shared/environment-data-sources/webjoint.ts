import { xhrRequestSource } from "../sources/xhr-request-source";
import { EnvironmentEvents, TransactionCartItem } from "../types";

const webjointDataSource = ({ transactionEvent }: Pick<EnvironmentEvents, "transactionEvent">) => {
  xhrRequestSource((data: any): void => {
    if (window.location.href.includes("confirmation")) {
      const transaction = data.orders[0];

      transactionEvent({
        id: transaction.id,
        total: parseFloat(transaction.total),
        tax: parseFloat(transaction.taxes),
        city: "N/A",
        country: "USA",
        currency: "USD",
        shipping: 0,
        state: "N/A",
        items: transaction.details.map((item: any) => {
          const { name, quantity } = item;
          return {
            orderId: transaction["_id"],
            category: "N/A",
            currency: "USD",
            name,
            quantity,
            sku: "N/A",
            unitPrice: 0,
          } as TransactionCartItem;
        }),
      });
    }


    // (function () {
    //   var send = XMLHttpRequest.prototype.send;
    //   XMLHttpRequest.prototype.send = function (data) {
    //     this.addEventListener("readystatechange", function () {
    //       var parsedData = JSON.parse(data);
    //       console.log(parsedData)
    //       var transaction = {}
    //       if (parsedData && Object.keys(parsedData).includes('orders')) {
    //         transaction.id = parsedData.orders[0].id
    //         transaction.total = parsedData.orders[0].total
    //         transaction.tax = parsedData.orders[0].tax
    //       } 
    
    //       var isResultsURL = window.location.href.includes("confirmation")
    //       if (isResultsURL) {
    //         console.log('submitting transaction')
    //         console.log(transaction.id)
    //         console.log(transaction.total)
    //         console.log(transaction.tax)
    //         window.tracker(
    //           "addTrans",
    //           transaction.id,
    //           '6ce6f770-6a55-485d-b807-1cdb81e57aff',
    //           transaction.total,
    //           transaction.tax,
    //           'N/A',
    //           'N/A',
    //           'N/A',
    //           'USA'
    //         );
    //         window.tracker("trackTrans");
    //       }
    //     });
    //     send.apply(this, arguments);
    //   };
    // })();
  });
};

export default webjointDataSource;
