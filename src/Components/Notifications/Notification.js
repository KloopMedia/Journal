import React, { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';

import { Redirect } from 'react-router';
import { Grid } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
	root: {
		margin: 20,
		width: 500,
		[theme.breakpoints.down("sm")] : {
			maxWidth: 300 
		}
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
}));

const TaskCard = (props) => {
	const classes = useStyles();
	const { title, description, id, index, setShown, shown } = props

	const [show, setShow] = useState(false)

	useEffect(() => {
		if (shown) {
			setShow(true)
		}
		else {
			setShow(false)
		}
	}, [shown])

	return (
		<Grid container justify="center">
			<Card className={classes.root} style={show ? {background: 'grey', opacity: 0.25} : {background: 'lightblue'}} >
				<CardContent>
					<Typography variant="h6">
						{title}
					</Typography>
					<Typography variant="body2" component="p">
						{description}
					</Typography>
				</CardContent>
				<CardActions style={{justifyContent:'flex-end'}}>
					<Button size="small" onClick={() => setShown(id)}>{"Просмотрено"}</Button>
				</CardActions>
			</Card>
		</Grid>
	);
}

export default TaskCard