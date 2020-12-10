import React, { useState, useEffect, useContext } from 'react'
import firebase, { signInWithGoogle } from '../../util/Firebase'
import { AuthContext } from "../../util/Auth";
import { Grid, Typography } from '@material-ui/core';

import TaskCard from './Card'


const Tasks = (props) => {

	const [allTasks, setTasks] = useState(null)
	const [submittedTasks, setSubmitted] = useState(null)
	const { currentUser } = useContext(AuthContext);

	useEffect(() => {
		if (currentUser) {
			let tasks = []
			let submitted = []
			console.log("Fired")
			firebase.firestore().collection("tasks").where("assigned_users", "array-contains", currentUser.uid).get()
				.then((querySnapshot) => {
					querySnapshot.forEach((doc) => {
						console.log(doc.id, " => ", doc.data());
						if (doc.data().is_complete) {
							submitted.push({ id: doc.id, ...doc.data() })
						}
						else {
							tasks.push({ id: doc.id, ...doc.data() })
						}

					});
				})
				.then(() => {
					setTasks(tasks)
					setSubmitted(submitted)
				})
				.catch((error) => {
					console.log("Error getting documents: ", error);
				});
		}
	}, [currentUser])




	return (
		<Grid container justify="center" alignItems="center" direction="column">
			{/* <Grid>
				<Button onClick={requestTask}>Получить задание</Button>
			</Grid> */}
			<Typography variant="h4">Задания</Typography>

			{allTasks && allTasks.map((task, i) => (
				<Grid key={'active_task_'+i} style={{ padding: 10 }}>
					<TaskCard title={task.title} complete={task.is_complete} description={task.description} type={task.type} id={task.id} />
				</Grid>
			))}
			{submittedTasks && submittedTasks.map((task, i) => (
				<Grid key={'submitted_task_'+i} style={{ padding: 10 }}>
					<TaskCard title={task.title} complete={task.is_complete} description={task.description} type={task.type} id={task.id} />
				</Grid>
			))}

		</Grid>
	)
}

export default Tasks