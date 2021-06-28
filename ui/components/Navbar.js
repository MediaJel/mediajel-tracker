import React from "react";
import AppBar from "@material-ui/core/AppBar";
import Box from "@material-ui/core/Box";
import Toolbar from "@material-ui/core/Toolbar";
import Button from "@material-ui/core/Button";

// Todo: Set up actual routing... Nothing to actually route to right now :(

function Navbar() {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Button color="inherit">jane</Button>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
export default Navbar;
