import express from "express";

const app = express();
const port = 3000;

app.use(express.static("docs/mediajel-tracker/1.0.0"));

app.listen(port, () => {
  console.log(`Serving docs on ${port}`);
});
