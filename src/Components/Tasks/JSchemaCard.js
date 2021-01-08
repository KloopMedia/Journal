import React, { useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';

import { Redirect, useHistory } from 'react-router';
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
	const history = useHistory();
	const { complete, id, cardColor, cardType, stage, stageID, task, user, pCase } = props

	const [waiting, setWaiting] = useState(false)
	const [newTaskId, setNewTaskId] = useState(null)

	const handleOpen = () => {
		if (cardType === "creatable" || cardType === "selectable" || cardType === "creatableUnlim") {
			sendCallbackRequest()
		} else {
			history.push("/t/" + id)
			//setRedirect(true)
		}
	}

	const sendCallbackRequest = () => {
		setWaiting(true)
		let callback = ""
		let callbackType = ""
		let callbackName = ""
		if (cardType === "creatable" || cardType === "creatableUnlim") {
			callback = uuidv4()
			callbackType = "callbackId"
			callbackName = "callbackId"
		} else if (cardType === "selectable") {
			callback = id
			callbackName = "taskId"
			callbackType = firebase.firestore.FieldPath.documentId()
		}
		firebase.firestore()
			.collection("task_requests")
			.doc(user.uid)
			.collection("requests")
			.add({
				status: "pending",
				user: user.uid,
				case_type: pCase,
				case_stage_id: stageID,
				[callbackName]: callback
			}).then((doc) => {
			const unsubscribe = firebase.firestore()
				.collection("tasks")
				.where("assigned_users", "array-contains", user.uid)
				.where(callbackType, "==", callback)
				.onSnapshot(snapshot => {
					snapshot.docChanges().forEach(change => {
						if (change.type === "added") {
							if (change.doc.id) {
								//setNewTaskId(change.doc.id)
								//setRedirect(true)
								unsubscribe()
								history.push("/t/" + change.doc.id)
							}
						}
					})
				})

		})
	}

	return (
		<Card key={id} className={classes.root} style={{background: cardColor}}>
			<CardContent>
				<Box display="flex" justifyContent="space-between" alignItems="center">
					<Typography variant="h6">
						{stage.title}
					</Typography>
					{complete && <Typography color="error">
						Сдано
					</Typography>}
				</Box>
				<Typography variant="subtitle1" className={classes.pos} color="textSecondary">
					#{id}
				</Typography>
				<Typography variant="body2" component="p">
					Задание: {stage.description}
				</Typography>
			</CardContent>
			<CardActions>
				{waiting ?
					<CircularProgress/>
					:
					<Button size="small" onClick={handleOpen}>{(cardType === "creatableUnlim") ? "СОЗДАТЬ НОВУЮ ФОРМУ" : "Открыть"}</Button>
				}
			</CardActions>
		</Card>
	);
}

export default JSchemaTaskCard