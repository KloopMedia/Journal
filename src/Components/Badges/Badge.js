import {Button, Grid, Typography} from '@material-ui/core';
import React, {useState, useEffect} from 'react'
import {useParams} from 'react-router';
import firebase from '../../util/Firebase'
import {jsPDF} from "jspdf";


const Badge = (props) => {
    const {prefix, id} = useParams();
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

    // console.log('id', typeof id, 'type', prefix)
    useEffect(() => {
        if (id && prefix) {
            firebase.firestore().collection('badges').where('prefix', '==', prefix).where('number', '==', parseInt(id)).get().then(snap => {
                let tmp = []
                snap.forEach(doc => {
                    if (doc.data().file_url) {
                        tmp.push(
                            // <Grid container item justify="center" key={doc.id}><img style={{ maxWidth: '100%' }} src={doc.data().file_url} alt={doc.data().file_url} /></Grid>
                            <Grid container item justify="center" style={{paddingTop: 10}}>
                                <Grid container item justify="center">
                                    <Button variant="contained" color="primary"
                                            onClick={() => getPdfFromImage(doc.data().file_url, doc.id)}>Скачать
                                        PDF</Button>
                                </Grid>
                                <Grid container item justify="center" key={doc.id}>
                                    <img style={{maxWidth: '100%'}} src={doc.data().file_url}
                                         alt={doc.data().file_url}/>
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
    }, [id, prefix])

    return (
        badges.length > 0 ?
            <Grid container direction="column" justify="center" spacing={1}>
                <Grid item>
                    <Typography align="center" variant="h6">Удостоверение действительно до 01.12.2021г. Мы подтверждаем,
                        что этот человек является внештатным журналистом «Клооп Медиа».</Typography>
                </Grid>
                <Grid item>
                    <Typography align="center" variant="h6">Күбөлүк 01.12.2021 чейин жарактуу. Биз бул адам «Клооп
                        Медианын» штаттан тышкаркы журналисти экенин тастыктайбыз.</Typography>
                </Grid>
                {badges[0]}
            </Grid>
            :
            <Grid container direction="column" justify="center" spacing={1}>
                <Grid item>
                    <Typography align="center" variant="h5">Если ссылка не открывается — значит, у нас нет такого
                        внештатного журналиста, это могут быть мошенники.</Typography>
                </Grid>
                <Grid item>
                    <Typography align="center" variant="h5">Эгерде шилтеме ачылбай жатса, демек биздин мындай штаттан
                        тышкаркы журналистибиз жок. Бул аферисттер болушу мүмкүн.</Typography>
                </Grid>
            </Grid>
    )
}

export default Badge