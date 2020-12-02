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
    const { caseId } = props
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
                        console.log(doc.id, " => ", doc.data());
                        tasks.push({ id: doc.id, ...doc.data() })
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
        firebase.firestore().collection('tasks').where('assigned_users', 'array-contains', currentUser.uid).get().then(snap => {
            if (snap.empty) {
                setDisable(false)
                // firebase.firestore().collection('tasks').where('assigned_users', '==', []).get().then(docs => {
                //     if (docs.empty) {
                //         setAllow(false)
                //         setMessage('Нет доступных тасков')
                //     }
                // })
            }
            else {
                setDisable(true)
                setMessage('У вас есть активные задания. Сдайте или освободите их, чтобы получить новые.')
            }
        })
    }, [currentUser, disableCase])

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
                    <Box style={{padding: '10px 10px 0px'}}>
                        <Typography color="error">{message}</Typography>
                    </Box>
                </Box>

                <Grid container justify="center" style={{ padding: 10 }}>
                    {ready && allTasks.map((t, i) => (
                        <Grid item key={i} style={{ padding: 10 }}>
                            <Card title={t.title} description={t.description} type={t.type} id={t.id} cardColor="#F5F5F5" sendRequest={sendRequest} disabled={disableCase} />
                        </Grid>
                    ))}
                </Grid>
            </Paper>
        </div>
    )
}

export default Case