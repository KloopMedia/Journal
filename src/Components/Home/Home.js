import React, { useContext, useEffect, useState } from 'react'
import firebase, { signInWithGoogle } from '../../util/Firebase'
import { AuthContext } from "../../util/Auth";
import moment from 'moment';
import { v1 as uuid } from 'uuid'
import { Button, Dialog, DialogContent, DialogContentText, DialogTitle, Grid, Link, makeStyles, Typography } from '@material-ui/core';

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
    const [open, setOpen] = React.useState(false);

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
                    if (doc.exists && doc.data().tg_id) {
                        console.log("TGID: ", doc.data().tg_id)
                        setTgId(doc.data().tg_id)
                    }
                    else {
                        setOpen(true)
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
                    <Typography>Здравствуйте, дорогие наблюдатели!</Typography>
                    <Typography>Чтобы понять, как работает бот посмотрите нашу <Link href="https://www.youtube.com/watch?v=jJX5uMqqC7Q&feature=youtu.be">видео-инструкцию</Link>.</Typography>
                    <Typography>30 марта в 18:00  состоится общий созвон для вопросов-ответов по техническим моментам.</Typography>
                    <Typography>1 апреля с 08:00 до 22:00 состоится репетиция выборов.</Typography>
                    <Typography>5 апреля в 18:00 состоится  итоговый общий созвон для вопросов-ответов.</Typography>
                    <Typography>8 апреля с 08:00 до 22:00 состоится генеральная репетиция выборов.</Typography>
                    <Typography>Всю информацию по репетиции мы вышлем через телеграм-бот, обязательно читайте все сообщения, которые вам приходят.</Typography>
                </Grid>
                {tgId.length === 0 ?
                    <Dialog
                        fullWidth
                        open={open}
                        aria-labelledby="max-width-dialog-title"
                    >
                        <DialogTitle id="max-width-dialog-title">
                            <Typography style={{ paddingBottom: 10 }} variant="h5" align="center">Подключите бот, чтобы пользоваться системой / Системаны колдонуу үчүн ботко кошулуңуз</Typography>
                        </DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                <Grid container justify="center">
                                    <Typography style={{ paddingBottom: 10 }} variant="h5" align="center">Вы можете связать свой
                            аккаунт с нашим Телеграм-ботом. Для этого нажмите на ссылку ниже.</Typography>
                                    <Typography style={{ paddingBottom: 10 }} variant="h5" align="center">Сиз өзүңүздүн аккаунтуңузду биздин телеграм-ботко туташтыра аласыз. Ал үчүн төмөндөгү шилтемени басыңыз.</Typography>
                                    {token ? <Link variant="h5" href={"https://telegram.me/journal_tg_bot?start=" + token}>Ссылка на бот / Ботко шилтеме</Link>
                                        : <Typography variant="body2" align="center">Если ссылка не создалась в течение 5 секунд, перезагрузите страницу</Typography>}
                                    <Button style={{marginTop: 20}} size="large" color="primary" variant="contained" onClick={signInWithGoogle}>
                                        Войти с другого аккаунта
                                    </Button>
                                </Grid>
                            </DialogContentText>
                        </DialogContent>
                    </Dialog> :
                    null}
                {/* <Grid container justify="center" className={classes.message}>
                        <Typography style={{ paddingBottom: 10 }} variant="h5" align="center">Вы можете связать свой
                            аккаунт с нашим Телеграм-ботом. Для этого нажмите на ссылку ниже.</Typography>
                        {token ? <Link variant="h5" href={"https://telegram.me/journal_tg_bot?start=" + token}>Ссылка на бот</Link>
                            : <Typography variant="body2" align="center">Если ссылка не создалась в течение 5 секунд,
                                перезагрузите страницу</Typography>}
                    </Grid> */}


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