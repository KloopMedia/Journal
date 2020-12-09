import React, { useContext, useEffect, useRef, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import { Typography, IconButton, Box, Button, Snackbar } from '@material-ui/core';
import FeedbackIcon from '@material-ui/icons/Feedback';
import FeedbackDialog from '../Dialog/FeedbackDialog'
import Feedback from './feedback'

import firebase from '../../util/Firebase'

const useStyles = makeStyles((theme) => ({
    root: {
        '& > *': {
            width: '40ch',
        },
    },

}));


const File = (props) => {
    const classes = useStyles();
    const [value, setValue] = React.useState('');
    const [dialogOpen, setDialogOpen] = useState(false)
    const [feedbackValue, setFeedback] = useState({})
    const [feedbackFormData, setFormData] = useState({})
    const [showFeedback, setShowFeedback] = useState(false)

    const { returnFile, locked, id, feedbackType, askFeedback, saveQuestionFeedback, prevTaskId } = props

    useEffect(() => {
        console.log(feedbackType)
        if (feedbackType && askFeedback) {
            console.log(feedbackType)
            firebase.firestore().collection('schema').doc('structure').collection('feedbacks').doc(feedbackType).get().then(doc => {
                setFormData(doc.data())
            })
            setShowFeedback(true)
        }
        else {
            setShowFeedback(false)
        }
    }, [feedbackType])

    const handleChange = (event) => {
        returnFile(event.target.files, id)
    };

    const sendFeedback = () => {
        saveQuestionFeedback(feedbackValue, id, prevTaskId)
        handleDialogClose()
    }

    const returnFeedback = (value) => {
        setFeedback(value)
    }


    const handleDialogClose = () => {
        setDialogOpen(false)
    }

    return (
        <div>
            {/* <FeedbackDialog
                title={feedbackFormData.title}
                dialogFunction={sendFeedback}
                state={dialogOpen}
                handleClose={handleDialogClose}
                feedbackValue={feedbackValue}
                answers={feedbackFormData.answers}
                description={feedbackFormData.description}
                returnFeedback={returnFeedback}
            />
            <Box display="flex" style={{ marginBottom: 10, marginTop: 20 }}>
                <Typography variant="h6" style={{ paddingRight: 8 }}>{props.title}</Typography>
                {showFeedback && <IconButton size="small" onClick={() => setDialogOpen(true)}><FeedbackIcon color="primary" /></IconButton>}
            </Box> */}
            <input
                    type="file"
                    onChange={handleChange}
                    multiple
                />
        </div>
    );
}

export default File