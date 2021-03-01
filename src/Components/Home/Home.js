import React, { useContext, useEffect, useState } from 'react'
import firebase, { signInWithGoogle } from '../../util/Firebase'
import { AuthContext } from "../../util/Auth";
import moment from 'moment';
import { v1 as uuid } from 'uuid'
import { Button, Grid, Link, makeStyles, Typography } from '@material-ui/core';

const queryString = require('query-string');

const useStyles = makeStyles(theme => ({
    root: {
        marginTop: 20,
        background: 'lightgreen',
        // height: 200,
        width: 500,
        [theme.breakpoints.down("sm")]: {
            maxWidth: 300
        }
    },
    message: {
        background: 'lightgreen',
        // height: 200,
        width: 500,
        margin: 10,
        padding: 10,
        [theme.breakpoints.down("sm")]: {
            maxWidth: 300
        }
    }
}));


const Home = (props) => {
    const classes = useStyles();
    const [token, setToken] = useState(null)
    const { currentUser } = useContext(AuthContext);
    const [tgId, setTgId] = useState("")

    useEffect(() => {
        const makeToken = () => {
            return uuid().toString() + '_' + Date.now()
        }
        let unsubscribeUser = () => { }
        let unsubscribeUserPrivate = () => { }
        if (currentUser) {
            unsubscribeUser = firebase.firestore()
                .collection('users')
                .doc(currentUser.uid)
                .onSnapshot(doc => {

                    let oldToken;
                    if (doc.exists && doc.data().tg_token) {
                        oldToken = doc.data().tg_token
                    } else {
                        oldToken = false
                    }

                    console.log(oldToken)
                    if (oldToken) {
                        console.log(oldToken)
                        let oldDate = parseInt(oldToken.substring(oldToken.indexOf('_') + 1))
                        let date = moment().diff(oldDate, 'hours')
                        console.log(date)
                        if (date > 0) {
                            let newToken = makeToken()
                            firebase.firestore().collection('users').doc(currentUser.uid).update({ tg_token: newToken })
                            setToken(newToken)
                        } else {
                            setToken(oldToken)
                        }
                    } else {
                        console.log('no token')
                        let newToken = makeToken()
                        firebase.firestore().collection('users').doc(currentUser.uid).update({ tg_token: newToken })
                        setToken(newToken)
                    }
                })
            unsubscribeUserPrivate = firebase.firestore()
                .collection('users')
                .doc(currentUser.uid)
                .collection("user_private")
                .doc("private")
                .onSnapshot(doc => {
                    console.log("TGID: ", doc.data().tg_id)
                    if (doc.exists && "tg_id" in doc.data()) {
                        console.log("TGID: ", doc.data().tg_id)
                        setTgId(doc.data().tg_id)
                    }
                })
        }
        return () => {
            unsubscribeUser()
            unsubscribeUserPrivate()
        }
    }, [currentUser])

    useEffect(() => {
        if (currentUser) {
            let urlString = queryString.parse(window.location.search)
            if (urlString.rank) {
                console.log(urlString.rank)
                firebase.firestore().collection('schema').doc('structure').collection('ranks').doc(urlString.rank).get().then(doc => {
                    if (doc.exists) {
                        console.log('creating request')
                        firebase.firestore().collection('rank_requests').add({
                            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                            user_id: currentUser.uid,
                            processed: false,
                            rank: doc.id
                        })
                    }
                    else {
                        console.log('no rank')
                    }
                })
            }
        }
    }, [currentUser])

    return (
        currentUser ?
            <Grid>
                <Grid container className={classes.message}>
                    <Typography>Здравствуйте, дорогие наблюдатели! Мы рады приветствовать вас в наших рядах!</Typography>
                    <Typography>Если вы не знаете, как заполнить анкету, то посмотрите <Link href="https://www.youtube.com/watch?v=bkukGAemNTY&feature=youtu.be">наше видео</Link></Typography>
                    <Typography>Чтобы понять, как работает бот посмотрите нашу <Link href="https://www.youtube.com/watch?v=jJX5uMqqC7Q&feature=youtu.be">видео-инструкцию</Link></Typography>
                    <Typography>Чтобы все начало работать, вам необходимо в самом начале нажать на кнопку Получить ранг El-Monitor</Typography>
                    <Typography>Чтобы получать каждый день задания от нас, перейдите в раздел <Link href="https://kloopmedia.github.io/Journal/#/p/test_page">Тест</Link></Typography>
                </Grid>
                {tgId === "" ?
                    <Grid container justify="center" className={classes.message}>
                        <Typography style={{ paddingBottom: 10 }} variant="h5" align="center">Вы можете связать свой
                            аккаунт с нашим Телеграм-ботом. Для этого нажмите на ссылку ниже.</Typography>
                        {token ? <Link variant="h5" href={"https://telegram.me/journal_tg_bot?start=" + token}>Ссылка на бот</Link>
                            : <Typography variant="body2" align="center">Если ссылка не создалась в течение 5 секунд,
                                перезагрузите страницу</Typography>}
                    </Grid>
                    :
                    null}
            </Grid>
            :
            <Grid container direction="column" style={{ padding: 20 }} justify="center">
                <Typography align="center" variant="h3">Регистрация</Typography>
                <br />
                <Button size="large" color="primary" variant="contained" onClick={signInWithGoogle}>Войти с помощью
                    аккаунта Google</Button>
            </Grid>
    )
}

export default Home