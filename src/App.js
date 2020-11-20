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

import Appbar from './Components/Appbar/Appbar'
import Profile from './Components/Profile/Profile'
import Tasks from './Components/Tasks/Tasks'
import Task from './Components/Tasks/Task'


function Home() {
  return <h2>Home</h2>;
}

const App = () => {
  const { currentUser } = useContext(AuthContext);

  return (
      <Router>
        <Grid container justify="center">
          <Appbar>
            <Switch>
              <Route exact path="/profile">
                <Profile />
              </Route>
              <Route exact path="/tasks">
                <Tasks />
              </Route>
              <Route path="/tasks/:id">
                <Task />
              </Route>
              <Route exact path="/">
                <Home />
              </Route>
            </Switch>
          </Appbar>
        </Grid>
      </Router>
  )
}

export default App;
