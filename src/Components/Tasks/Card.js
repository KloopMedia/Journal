import React, { useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';

import { Redirect } from 'react-router';

const useStyles = makeStyles({
	root: {
		minWidth: 250
	},
	bullet: {
		display: 'inline-block',
		margin: '0 2px',
	},
	title: {
		fontSize: 14,
	},
	pos: {
		marginBottom: 12,
	},
});

const TaskCard = (props) => {
	const classes = useStyles();
	const { title, status, type, language, description, id, cardColor, sendRequest, disabled } = props

	const [redirect, setRedirect] = useState(false)

	return (
		<div>
			{redirect && <Redirect to={"/tasks/" + id} />}
			<Card className={classes.root} style={{background: cardColor}}>
				<CardContent>
					<Typography variant="h6">
						{title}
					</Typography>
					<Typography variant="subtitle1" className={classes.pos} color="textSecondary">
						#{type}
					</Typography>
					<Typography variant="body2" component="p">
						Задание: {description}
					</Typography>
				</CardContent>
				<CardActions>
					{sendRequest ? 
						<Button variant="contained" disabled={disabled} color="primary" size="small" onClick={() => sendRequest(type, id)}>{"Получить задание"}</Button>
						:
						<Button size="small" onClick={() => setRedirect(true)}>{"Открыть"}</Button>
					}
				</CardActions>
			</Card>
		</div>
	);
}

export default TaskCard