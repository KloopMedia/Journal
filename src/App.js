import React, { useState, useContext } from 'react'
import { AuthProvider } from "./util/Auth";
import {
  HashRouter as Router,
  Switch,
  Route,
  Link,
  Redirect
} from "react-router-dom";
import { AuthContext } from "./util/Auth";

import Grid from '@material-ui/core/Grid'

import Profile from './Components/Profile/Profile'
import Appbar from './Components/Appbar/Appbar'

function Home() {
  return <h2>Home</h2>;
}


function Users() {
  return <h2>Users</h2>;
}

const App = () => {
  const { currentUser } = useContext(AuthContext);

  return (
      <Router>
        <Grid container justify="center">
          <Appbar>
            <Switch>
              <Route path="/profile">
                <Profile />
              </Route>
              <Route path="/users">
                <Users />
              </Route>
              <Route path="/">
                <Home />
              </Route>
            </Switch>
          </Appbar>
        </Grid>
      </Router>
  )
}

export default App;
