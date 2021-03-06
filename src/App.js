import React, { useState, useContext, useEffect } from 'react'
import { AuthProvider } from "./util/Auth";
import firebase from './util/Firebase'
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
import Signin from './Components/Auth/Signin';
import PrivateRoute from './util/PrivateRoute';
import FAQ from './Components/FAQ/FAQ';
import Page from "./Components/Page/Page";
import JSchemaTask from "./Components/Tasks/JSchemaTask";
import Badge from './Components/Badges/Badge'
import UserBadges from './Components/Badges/userBadges'


const App = () => {
  const { currentUser } = useContext(AuthContext);

  const [tgId, setTgId] = useState("")

  useEffect(() => {
    let unsubscribeUserPrivate = () => { }
    if (currentUser) {
      unsubscribeUserPrivate = firebase.firestore()
        .collection('users')
        .doc(currentUser.uid)
        .collection("user_private")
        .doc("private")
        .onSnapshot(doc => {
          if (doc.exists && "tg_id" in doc.data()) {
            console.log("APP TGID: ", doc.data().tg_id)
            setTgId(doc.data().tg_id)
          }
        })
    }
    return () => {
      unsubscribeUserPrivate()
    }
  }, [currentUser])


  return (
    <Router>
      <Grid container justify="center">
        <Appbar>
          {tgId !== "" ? <Switch>
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
            <Route path="/t/:id">
              <JSchemaTask />
            </Route>
            <Route exact path="/tasksObserver">
              <TasksObserver />
            </Route>
            <Route exact path="/notifications">
              <Notifications />
            </Route>
            <Route exact path="/signin">
              <Signin />
            </Route>
            <Route exact path="/faq">
              <FAQ />
            </Route>
            <Route exact path="/badges/:prefix/:id">
              <Badge />
            </Route>
            <Route exact path="/mybadges">
              <UserBadges />
            </Route>
            <Route path="/p/:id">
              {currentUser ?
                <Page />
                :
                <Signin />}
            </Route>
            <PrivateRoute path="/" component={Home} />
          </Switch>
            :
            <Switch>
              <Route exact path="/badges/:prefix/:id">
                <Badge />
              </Route>
              <Route>
                <Home />
              </Route>
            </Switch>
          }
        </Appbar>
      </Grid>
    </Router>
  )
}

export default App;
