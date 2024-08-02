export const buildNexxenSegment = (segmentId: string) => {
  console.log("Building s2 segment with segmentId: ", segmentId);

  const pixel = document.createElement("img");
  pixel.src = `https://r.turn.com/r/beacon?b2=${segmentId}&cid=1234&bprice=50`;
  pixel.border = "0";
  document.body.appendChild(pixel);
};
