import React, { useState, useEffect, useContext } from 'react'
import firebase, { signInWithGoogle } from '../../util/Firebase'
import { AuthContext } from "../../util/Auth";
import { Redirect } from 'react-router';

import TextInput from "../form/textInput";
import SelectBox from "../form/selectBox";
import RadioButton from "../form/radiobutton";
import TimePickers from "../form/timePickers";
import Checkbox from "../form/checkbox"
import { Button, Grid, Typography } from '@material-ui/core';

import TaskCard from './Card'


const Tasks = (props) => {

	const [allTasks, setTasks] = useState(null)
	const { currentUser } = useContext(AuthContext);

	useEffect(() => {
		if (currentUser) {
			let tasks = []
			console.log("Fired")
			firebase.firestore().collection("tasks").where("assigned_users", "array-contains", currentUser.uid).get()
				.then((querySnapshot) => {
					querySnapshot.forEach((doc) => {
						console.log(doc.id, " => ", doc.data());
						tasks.push({ id: doc.id, data: doc.data() })
					});
				})
				.then(() => {
					setTasks(tasks)
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
				<Grid key={i} style={{padding: 10}}>
					<TaskCard title={task.data.title} description={task.data.description} type={task.data.type} id={task.id} />
				</Grid>
			))}

		</Grid>
	)
}

export default Tasks