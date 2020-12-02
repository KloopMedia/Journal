import React, { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import { Typography, IconButton, Box } from '@material-ui/core';
import FeedbackIcon from '@material-ui/icons/Feedback';
import Dialog from '../Dialog/Dialog'
import Feedback from './feedback'

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

	const { index, response, required, locked } = props

	const showFeedback = false

	useEffect(() => {
		if (response) {
			setValue(response)
		}
	}, [response])

	const handleChange = (event) => {
		setValue(event.target.value)
		props.returnAnswer(event.target.value, props.index)
	};

	const sendReport = () => {
		alert(answer)
	}


	const handleDialogClose = () => {
		setDialogOpen(false)
	}

	return (
		<div>
			<Dialog
				title="Фидбек"
				content={<Feedback answers={['Нет данных/неверные данные', 'Нет времени/интереса', 'Другое']} returnAnswer={setAnswer} />}
				dialogFunction={sendReport}
				state={dialogOpen}
				handleClose={handleDialogClose} />
			<Box display="flex" style={{ marginBottom: 10, marginTop: 20 }}>
				<Typography variant="h6" style={{ paddingRight: 8 }}>{props.title}</Typography>
				{showFeedback && <IconButton size="small" onClick={() => setDialogOpen(true)}><FeedbackIcon fontSize="medium" color="primary" /></IconButton>}
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