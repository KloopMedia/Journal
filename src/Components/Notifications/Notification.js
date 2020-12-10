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
		[theme.breakpoints.down("sm")]: {
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
	const { title, description, id, setShown, shown, date } = props

	const getFormatDate = (dt) => {
		// let month = '' + (d.getMonth() + 1)
		// let day = '' + d.getDate()
		// let year = d.getFullYear()

		// if (month.length < 2)
		// 	month = '0' + month;
		// if (day.length < 2)
		// 	day = '0' + day;
		let formatDate = `${
			dt.getDate().toString().padStart(2, '0')}/${
			(dt.getMonth()+1).toString().padStart(2, '0')}/${
			dt.getFullYear().toString().padStart(4, '0')} ${
			dt.getHours().toString().padStart(2, '0')}:${
			dt.getMinutes().toString().padStart(2, '0')}:${
			dt.getSeconds().toString().padStart(2, '0')}`

		return formatDate
	}

	return (
		<Grid container justify="center">
			<Card className={classes.root} style={shown ? { background: 'grey', opacity: 0.25 } : { background: 'lightblue' }} >
				<CardContent>
					<Typography variant="h6">
						{title}
					</Typography>
					<Typography variant="body2" component="p">
						{description}
					</Typography>
				</CardContent>
				<CardActions style={{ justifyContent: 'space-between' }}>
					<Typography style={{paddingLeft: 8}} variant="subtitle2">{getFormatDate(date.toDate())}</Typography>
					<Button size="small" onClick={() => setShown(id)}>{"Просмотрено"}</Button>
				</CardActions>
			</Card>
		</Grid>
	);
}

export default TaskCard