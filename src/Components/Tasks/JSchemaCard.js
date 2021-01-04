import React, { useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';

import { Redirect } from 'react-router';
import { Box, Grid } from '@material-ui/core';
import firebase from "../../util/Firebase";
import { v4 as uuidv4 } from 'uuid';
import {CircularProgress} from "@material-ui/core";

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

const JSchemaTaskCard = (props) => {
	const classes = useStyles();
	const { title, complete, type, language, description, id, cardColor, sendRequest, disabled, creatable, pCase, stage, user } = props

	const [redirect, setRedirect] = useState(false)
	const [waiting, setWaiting] = useState(false)
	const [newTaskId, setNewTaskId] = useState(null)

	const handleOpen = () => {
		if (creatable) {
			sendCallbackRequest(pCase, stage)
		} else {
			setRedirect(true)
		}
	}

	const sendCallbackRequest = (pCase, stage) => {
		setWaiting(true)
		const callbackID = uuidv4()
		firebase.firestore()
			.collection("task_requests")
			.doc(user.uid)
			.collection("requests")
			.add({
				status: "pending",
				user: user.uid,
				case_type: pCase,
				case_stage_id: stage,
				callbackId: callbackID
			}).then((doc) => {
			const unsubscribe = firebase.firestore()
				.collection("tasks")
				.where("assigned_users", "array-contains", user.uid)
				.where("callbackId", "==", callbackID)
				.onSnapshot(snapshot => {
					snapshot.docChanges().forEach(change => {
						if (change.type === "added") {
							if (change.doc.id) {
								setNewTaskId(change.doc.id)
								setRedirect(true)
								unsubscribe()
							}
						}
					})
				})

		})
	}

	return (
		<div>
			{redirect && <Redirect to={"/t/" + (id || newTaskId)} />}
			<Card className={classes.root} style={{ background: cardColor }}>
				<CardContent>
					<Box display="flex" justifyContent="space-between" alignItems="center">
						<Typography variant="h6">
							{title}
						</Typography>
						{complete && <Typography color="error">
							Сдано
						</Typography>}
					</Box>
					<Typography variant="subtitle1" className={classes.pos} color="textSecondary">
						#{type}
					</Typography>
					<Typography variant="body2" component="p">
						Задание: {description}
					</Typography>
				</CardContent>
				<CardActions>
					{waiting ?
						<CircularProgress />
						:
						<Button size="small" onClick={handleOpen}>{"Открыть"}</Button>
					}
				</CardActions>
			</Card>
		</div>
	);
}

export default JSchemaTaskCard