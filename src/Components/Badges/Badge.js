import { Grid, Typography } from '@material-ui/core';
import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router';
import firebase from '../../util/Firebase'


const Badge = (props) => {
    const { prefix, id } = useParams();
    const [badges, setBadges] = useState([])

    // console.log('id', typeof id, 'type', prefix)
    useEffect(() => {
        if (id && prefix) {
            firebase.firestore().collection('badges').where('prefix', '==', prefix).where('number', '==', parseInt(id)).get().then(snap => {
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
    }, [id, prefix])

    return (
        badges.length > 0 ?
            <Grid container direction="column" justify="center" spacing={1}>
                <Grid item>
                    <Typography align="center" variant="h6">Удостоверение действительно до 16.04.2021г. Мы подтверждаем, что этот человек является внештатным журналистом «Клооп Медиа».</Typography>
                </Grid>
                <Grid item>
                    <Typography align="center" variant="h6">Күбөлүк 16.04.21 чейин жарактуу. Биз бул адам «Клооп Медианын» штаттан тышкаркы журналисти экенин тастыктайбыз.</Typography>
                </Grid>
                {badges[0]}
            </Grid>
            :
            <Grid container direction="column" justify="center" spacing={1}>
                <Grid item>
                    <Typography align="center" variant="h5">Если ссылка не открывается —  значит, у нас нет такого внештатного журналиста, это могут быть мошенники.</Typography>
                </Grid>
                <Grid item>
                    <Typography align="center" variant="h5">Эгерде шилтеме ачылбай жатса, демек биздин мындай штаттан тышкаркы журналистибиз жок. Бул аферисттер болушу мүмкүн.</Typography>
                </Grid>
            </Grid>
    )
}

export default Badge