import * as express from "express";

const app = express();
const port = 3001;

app.use(express.static("dist"));

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
