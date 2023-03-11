import * as express from "express";

const app = express();
const port = 3000;

app.use(express.static("docs"));

app.listen(port, () => {
  console.log(`Serving docs on ${port}`);
});
