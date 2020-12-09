import React, { useContext, useEffect, useState } from 'react'
import firebase, {signInWithGoogle} from '../../util/Firebase'
import { AuthContext } from "../../util/Auth";
import moment from 'moment';
import { v1 as uuid } from 'uuid'
import { Button, Grid, Link, makeStyles, Typography } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
    root: {
        marginTop: 20,
        background: 'lightgreen',
        height: 200,
        width: 500,
        [theme.breakpoints.down("sm")]: {
            maxWidth: 300
        }
    }
}));


const Home = () => {
    const classes = useStyles();
    const [token, setToken] = useState(null)
    const { currentUser } = useContext(AuthContext);

    useEffect(() => {
        const makeToken = () => {
            return uuid().toString() + '_' + Date.now()
        }
        if (currentUser) {
            firebase.firestore().collection('users').doc(currentUser.uid).get().then(doc => {
                const oldToken = doc.data().tg_token
                if (oldToken) {
                    console.log(oldToken)
                    let oldDate = parseInt(oldToken.substring(oldToken.indexOf('_') + 1))
                    let date = moment().diff(oldDate, 'hours')
                    console.log(date)
                    if (date > 0) {
                        let newToken = makeToken()
                        firebase.firestore().collection('users').doc(currentUser.uid).update({ tg_token: newToken })
                        setToken(newToken)
                    }
                    else {
                        setToken(oldToken)
                    }
                }
                else {
                    console.log('no token')
                    let newToken = makeToken()
                    firebase.firestore().collection('users').doc(currentUser.uid).update({ tg_token: newToken })
                    setToken(newToken)
                }
            })
        }

    }, [currentUser])

    return (
        currentUser ?
            <Grid container justify="center" direction="column" alignItems="center" className={classes.root}>
                <Typography style={{ paddingBottom: 10 }} variant="h5" align="center">Подключите аккаунт к Telegram боту (наблюдателям обязательно!)</Typography>
                <Link variant="h5" href={"https://telegram.me/journal_tg_bot?start=" + token}>Ссылка на бот</Link>
            </Grid>
            :
            <Grid container direction="column" style={{ padding: 20 }} justify="center">
                <Typography align="center" variant="h3">Регистрация</Typography>
                <br />
                <Button size="large" color="primary" variant="contained" onClick={signInWithGoogle}>Войти с помощью аккаунта Google</Button>
            </Grid>
    )
}

export default Home