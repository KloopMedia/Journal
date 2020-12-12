import React, { useEffect, useState, useContext } from 'react'
import { AuthContext } from "../../util/Auth";
import firebase from '../../util/Firebase'

import Paper from '@material-ui/core/Paper'
import Button from '@material-ui/core/Button';
import Snackbar from '@material-ui/core/Snackbar';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';

import Card from '../Tasks/Card'
import { Box, Grid, Typography } from '@material-ui/core'
import { set } from 'immutable';


const Case = (props) => {
    const { caseId, userRanks } = props
    const [allTasks, setTasks] = useState(null)
    const [ready, setReady] = useState(false)
    const { currentUser } = useContext(AuthContext);

    const [open, setOpen] = React.useState(false);
    const [disableCase, setDisable] = useState(false)
    const [message, setMessage] = useState('')

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }

        setOpen(false);
    };

    useEffect(() => {
        if (currentUser) {
            let tasks = []
            console.log("Fired")
            firebase.firestore().collection("schema").doc("structure").collection("cases").doc(caseId).collection("stages").get()
                .then((querySnapshot) => {
                    querySnapshot.forEach((doc) => {
                        // before change
                        //tasks.push({ id: doc.id, ...doc.data() }) 

                        //after change
                        const ranks = doc.data().ranks
                        console.log('RANKS')
                        console.log(ranks)
                        console.log(userRanks)
                        // if (ranks && userRanks.some(userRank => ranks.includes(userRank))) {
                        //     tasks.push({ id: doc.id, ...doc.data(), disabled: false })
                        // }
                        // else {
                        //     tasks.push({ id: doc.id, ...doc.data(), disabled: true })
                        //     setMessage(<Typography color="error" display="block">Получите достижение <Typography component="span" display="inline" color="primary" align="justify">Первопроходец Battle For Azeroth</Typography> чтобы активировать следующее задание</Typography>)
                        // }
                        tasks.push({ id: doc.id, ...doc.data(), disabled: false })
                        
                    });
                })
                .then(() => {
                    tasks.sort((a, b) => parseInt(a.order) - parseInt(b.order))
                    setTasks(tasks)
                    setReady(true)
                })
                .catch((error) => {
                    console.log("Error getting documents: ", error);
                });
        }
    }, [currentUser])

    useEffect(() => {
        if (currentUser) {
            firebase.firestore().collection('tasks').where('assigned_users', 'array-contains', currentUser.uid).where('is_complete', '==', false).get().then(snap => {
                if (snap.size < 3) {
                    console.log("SIZE", snap.size)
                    setDisable(false)
                }
                else {
                    setDisable(true)
                    setMessage(<Typography color="error">У вас есть активные задания. Сдайте или освободите их, чтобы получить новые.</Typography>)
                }
            })
        }
    }, [currentUser, disableCase, open])

    const sendRequest = (type, task_type) => {
        firebase.firestore().collection("task_requests").doc(currentUser.uid).collection("requests").add({
            taskType: type,
            status: "pending",
            user: currentUser.uid,
            case_type: caseId,
            case_stage_id: task_type
        }).then((doc) => {
            setOpen(true)
            console.log('sending request')
        })
    }

    return (
        <div>
            <Snackbar
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                open={open}
                autoHideDuration={6000}
                onClose={handleClose}
                message="Запрос отправлен"
                action={
                    <React.Fragment>
                        <IconButton size="small" aria-label="close" color="inherit" onClick={handleClose}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </React.Fragment>
                }
            />

            <Paper style={{ margin: '20px 5px', border: '1px grey solid' }}>
                <Box style={{ padding: '10px 20px 0px' }}>
                    <Box style={{ padding: '5px 10px 10px' }}>
                        <Typography variant="h6">{props.title}</Typography>
                    </Box>
                    <Box style={{ padding: '10px 10px 5px' }}>
                        <Typography variant="body2">{props.description}</Typography>
                    </Box>
                    <Box style={{ padding: '10px 10px 0px' }}>
                        {message}
                    </Box>
                </Box>

                <Grid container justify="center" style={{ padding: 10 }}>
                    {ready && allTasks.map((t, i) => (
                        <Grid item key={i} style={{ padding: 10 }}>
                            <Card title={t.title} description={t.description} type={t.type} id={t.id} cardColor="#F5F5F5" sendRequest={sendRequest} disabled={disableCase || t.disabled} />
                        </Grid>
                    ))}
                </Grid>
            </Paper>
        </div>
    )
}

export default Case