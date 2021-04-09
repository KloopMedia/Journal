import { Grid, Typography } from '@material-ui/core';
import React, { useState, useEffect, useContext } from 'react'
import firebase from '../../util/Firebase'
import { AuthContext } from "../../util/Auth";


const UserBadges = (props) => {
    const { currentUser } = useContext(AuthContext);
    const [badges, setBadges] = useState([])

    useEffect(() => {
        if (currentUser) {
            firebase.firestore().collection('badges').where('user_id', '==', currentUser.uid).get().then(snap => {
                let tmp = []
                snap.forEach(doc => {
                    if (doc.data().file_url) {
                        tmp.push(<Grid container item justify="center" key={doc.id}><img style={{ maxWidth: '100%' }} src={doc.data().file_url} alt={doc.data().file_url} /></Grid>)
                    }
                })
                return tmp
            }).then(tmp => {
                console.log("TMP", tmp)
                setBadges(tmp)
            })
        }
    }, [currentUser])

    return (
        badges.length > 0 ?
            <Grid container direction="column" justify="center" spacing={1}>
                <Grid item>
                    <Typography align="center" variant="h6">Удостоверение действительно до 16.04.2021г. Мы подтверждаем, что этот человек является внештатным журналистом «Клооп Медиа».</Typography>
                </Grid>
                <Grid item>
                    <Typography align="center" variant="h6">Күбөлүк 16.04.21 чейин жарактуу. Биз бул адам «Клооп Медианын» штаттан тышкаркы журналисти экенин тастыктайбыз.</Typography>
                </Grid>
                <Grid item>
                    <Typography align="center" variant="caption">Здравствуйте! Мы не смогли сделать вам бейджик, из-за того, что у вас было очень плохое качество фотографии или вы прикрепили видео. Свяжитесь пожалуйста с координаторами @aigesha05 @aizi_a @osmnlv @ily1424 @Gulzarmaratbek и срочно отправьте качественную фотографию — это для БЕЙДЖИКА.</Typography>
                </Grid>
                <Grid item>
                    <Typography align="center" variant="caption">Саламатсызбы! Сиздин сүрөтүңүздүн сапаты абдан начар болгон үчүн (же сиз видео тиркеп койгон үчүн) сизге бейджик жасай алган жокбуз. Азыр @aigesha05 @aizi_a @osmnlv @ily1424 @Gulzarmaratbek өзүңүздүн жакшы сапаттагы сүрөтүңүздү жөнөтүп коюңуз. Бул БЕЙДЖИК үчүн.</Typography>
                </Grid>
                {badges}
            </Grid>
            :
            <Grid container direction="column" justify="center" spacing={1}>
                <Grid item>
                    <Typography align="center" variant="h6">У вас нет активных удостоверений.</Typography>
                </Grid>
                <Grid item>
                    <Typography align="center" variant="h6">Сиздин активдүү күбөлүгүңүз жок.</Typography>
                </Grid>
            </Grid>
    )
}

export default UserBadges