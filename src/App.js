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

// import Appbar from './Components/Appbar/Appbar'
// import Appbar from './Components/Appbar/oldAppBar'
import Appbar from './Components/Appbar/newAppBar'
import Profile from './Components/Profile/Profile'
import Tasks from './Components/Tasks/Tasks'
import Task from './Components/Tasks/Task'
import Cases from './Components/Cases/Cases';
import Notifications from './Components/Notifications/Notifications'
import Home from './Components/Home/Home'
import TasksObserver from './Components/Moderator/TasksObserver'


const App = () => {

  return (
    <Router>
      <Grid container justify="center">
        <Appbar>
          <Switch>
            <Route exact path="/profile">
              <Profile />
            </Route>
            <Route exact path="/request">
              <Cases />
            </Route>
            <Route exact path="/tasks">
              <Tasks />
            </Route>
            <Route path="/tasks/:id">
              <Task />
            </Route>
            <Route exact path="/tasksObserver">
              <TasksObserver />
            </Route>
            <Route exact path="/notifications">
              <Notifications />
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
