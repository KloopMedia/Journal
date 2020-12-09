import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import { Typography, IconButton, Box } from '@material-ui/core';
import FeedbackIcon from '@material-ui/icons/Feedback';
import FeedbackDialog from '../Dialog/FeedbackDialog'
import Feedback from './feedback'
import FirebaseFileUploader from './FirebaseFileUploader'
import File from './file'

import firebase from '../../util/Firebase'

const useStyles = makeStyles((theme) => ({
	root: {
		'& > *': {
			width: '40ch',
		},
	},

}));


const BasicTextFields = forwardRef((props, ref) => {
	const classes = useStyles();
	const [value, setValue] = React.useState('');
	const [dialogOpen, setDialogOpen] = useState(false)
	const [answer, setAnswer] = useState(null)
	const [feedbackValue, setFeedback] = useState({})
	const [feedbackFormData, setFormData] = useState({})
	const [showFeedback, setShowFeedback] = useState(false)

	const { index, response, returnFile, locked, id, feedbackType, askFeedback, saveQuestionFeedback, prevTaskId, uploadFilesData, attachMaterials } = props

	useEffect(() => {
		if (response) {
			setValue(response)
		}
	}, [response])

	useEffect(() => {
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
		setValue(event.target.value)
		props.returnAnswer(event.target.value, props.index)
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

	const handleFilesUpload = (filename, downloadURL) => {
		uploadFilesData(filename, downloadURL, id)
	}

	return (
		<div>
			<FeedbackDialog
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
			</Box>
			<TextField
				id={"inputBox" + index}
				label="Мой ответ"
				value={value}
				onChange={handleChange}
				// required={required}
				multiline
				rows={5}
				disabled={locked}
				variant="outlined"
				fullWidth
			/>
			{!locked && attachMaterials && <File returnFile={returnFile} locked={locked} id={id} />}
			{/* <FirebaseFileUploader
                ref={ref}
                title={""}
                index={index}
                uploadFilesData={handleFilesUpload}
            /> */}
		</div>
	);
})

export default BasicTextFields