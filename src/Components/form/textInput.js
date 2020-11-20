import React, { useEffect } from 'react';
import {makeStyles} from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import { Typography } from '@material-ui/core';


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

	const {index, response, required, locked} = props

	useEffect(() => {
		if (response) {
			setValue(response)
		}
	}, [response])

	const handleChange = (event) => {
		setValue(event.target.value)
		props.returnAnswer(event.target.value, props.index)
	};

	return (
		<div>
			<Typography variant="h6" style={{marginBottom: 10, marginTop: 20}}>{props.title}</Typography>
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