interface EmitPurchaseInput {
  cid: string;
  bprice: number;
}
const nexxenSegmentBuilder = (segmentId: string) => {
  return {
    emit: () => {
      console.log("Building s2 segment with segmentId: ", segmentId);

      const pixel = document.createElement("img");
      pixel.src = `https://r.turn.com/r/beacon?b2=${segmentId}&cid=1234&bprice=50`;
      pixel.border = "0";
      document.body.appendChild(pixel);
    },

    emitPurchase: (input: EmitPurchaseInput) => {
      const { cid, bprice } = input;

      if (!cid || !bprice) {
        console.warn("Missing required purchase data for s2");
        return;
      }

      console.log("Emitting purchase event for segmentId: ", segmentId);

      const pixel = document.createElement("img");
      pixel.src = `https://r.turn.com/r/beacon?b2=${segmentId}&cid=${cid}&bprice=${bprice}`;
      pixel.border = "0";
      document.body.appendChild(pixel);
    },
  };
};

export default nexxenSegmentBuilder;
