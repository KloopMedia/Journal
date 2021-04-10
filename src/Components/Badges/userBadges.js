import { Button, Grid, Typography } from '@material-ui/core';
import React, { useState, useEffect, useContext } from 'react'
import firebase from '../../util/Firebase'
import { AuthContext } from "../../util/Auth";
import { jsPDF } from "jspdf";


const UserBadges = (props) => {
    const { currentUser } = useContext(AuthContext);
    const [badges, setBadges] = useState([])

    const fetchImage = async (blob) => {
        let dataUrl = await new Promise(resolve => {
            let reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
        return dataUrl
    }

    const downloadUrlAsPromise = (url) => {
        return new Promise((resolve, reject) => {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.responseType = "blob";
            xhr.onreadystatechange = (evt) => {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        resolve(xhr.response);
                    } else {
                        reject(new Error("Ajax error for " + url + ": " + xhr.status));
                    }
                }
            }
            xhr.send();
        })
    }

    const getPdfFromImage = async (url, filename) => {
        let blob = await downloadUrlAsPromise(url)
        let dataUrl = await fetchImage(blob)
        const pdfDoc = new jsPDF();
        pdfDoc.addImage(dataUrl, "JPEG", 0, 0, 70, 105);
        pdfDoc.save(filename)
    }

    useEffect(() => {
        if (currentUser) {
            firebase.firestore().collection('badges').where('user_id', '==', currentUser.uid).get().then(snap => {
                let tmp = []
                snap.forEach(doc => {
                    if (doc.data().file_url) {
                        tmp.push(
                            <Grid container item justify="center" style={{ paddingTop: 10 }}>
                                <Grid container item justify="center">
                                    <Button variant="contained" color="primary" onClick={() => getPdfFromImage(doc.data().file_url, doc.id)}>Скачать PDF</Button>
                                </Grid>
                                <Grid container item justify="center" key={doc.id}>
                                    <img style={{ maxWidth: '100%' }} src={doc.data().file_url} alt={doc.data().file_url} />
                                </Grid>
                            </Grid>
                        )
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