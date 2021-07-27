import React from "react";
import { Redirect, Route, Switch } from "react-router-dom";
import Jane from "../pages/Jane";

function Routes() {
  return (
    <Switch>
      <Route path={"/jane"} component={Jane} />
      <Redirect from={"/"} to={"/jane"} />
    </Switch>
  );
}

export default Routes;
