import React, { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import { Typography, IconButton, Box } from '@material-ui/core';
import FeedbackIcon from '@material-ui/icons/Feedback';
import Dialog from '../Dialog/FeedbackDialog'
import Feedback from './feedback'

import firebase from '../../util/Firebase'

const useStyles = makeStyles((theme) => ({
	root: {
		'& > *': {
			width: '40ch',
		},
	},

}));


function BasicTextFields(props) {
	const classes = useStyles();
	const [value, setValue] = React.useState('');
	const [dialogOpen, setDialogOpen] = useState(false)
	const [answer, setAnswer] = useState(null)
	const [feedbackValue, setFeedback] = useState({})
	const [feedbackFormData, setFormData] = useState({})
	const [showFeedback, setShowFeedback] = useState(false)

	const { index, response, required, locked, id, feedbackType, askFeedback, saveQuestionFeedback, prevTaskId } = props

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

	return (
		<div>
			<Dialog
				title={feedbackFormData.title}
				content={<Feedback answers={['Нет данных/неверные данные', 'Нет времени/интереса', 'Другое']} returnAnswer={setAnswer} />}
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
		</div>
	);
}

export default BasicTextFields