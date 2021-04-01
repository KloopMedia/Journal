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
import { CircularProgress } from "@material-ui/core";

const useStyles = makeStyles({
	root: {
		minWidth: 250,
		maxWidth: 400
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

	const handleOpenOld = () => {
		if (cardType === "creatable" || cardType === "selectable" || cardType === "creatableUnlim") {
			sendCallbackRequestOld()
		} else {
			history.push("/tasks/" + id)
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

	const sendCallbackRequestOld = () => {
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
									history.push("/tasks/" + change.doc.id)
								}
							}
						})
					})

			})
	}

	const displayJSON = (cardData) => {
		return Object.keys(cardData).map((stgId, i) => {
			// console.log("STAGE: ", stage)
			if (stgId === 'message') {
				return <Typography key={stgId + i}>{cardData[stgId]}</Typography>
			}
			return Object.keys(cardData[stgId]).map(response => {
				// console.log("RESPONSE: ", response)
				if (stage && stage.cardData && stage.cardData[stgId] && stage.cardData[stgId].includes(response)) {
					if (response === "attachedFiles") {
						// console.log("FILES: ")
						return <div key={stgId + response}>Files</div>
					} else return (
						<typography variant="body2" component="p" key={stgId + response}>
							{/* {console.log("TEXT: ", cardData[stgId][response])} */}
							{JSON.stringify(cardData[stgId][response], null, 2)}
						</typography>)
				}
			})
		})
	}

	return (
		<Box>
			<Card key={id} className={classes.root} style={{ background: cardColor }}>
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
						{(task && task.cardData && (cardType === "selectable" || (stage && stage.showCard))) ?
							displayJSON(task.cardData)
							//JSON.stringify(task.cardData, null, 2)
							:
							"Задание: " + stage.description}
					</Typography>
				</CardContent>
				<CardActions>
					{waiting ?
						<CircularProgress />
						:
						<Grid>
							<Button size="small" onClick={handleOpen}>{(cardType === "creatableUnlim") ? "СОЗДАТЬ НОВУЮ ФОРМУ" : "Открыть"}</Button>
							{stage.showOldButton && <Button size="small" onClick={handleOpenOld}>Открыть (Old)</Button>}
						</Grid>
					}
				</CardActions>
			</Card>
		</Box>
	);
}

export default JSchemaTaskCard