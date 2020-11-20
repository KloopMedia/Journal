import React, { useState, useEffect, useContext } from 'react'
import firebase, { signInWithGoogle } from '../../util/Firebase'
import { AuthContext } from "../../util/Auth";

import Form from "../form/form"

import { Button, Grid, Typography } from '@material-ui/core';
import { Redirect, useParams } from 'react-router';


const Profile = () => {
	const [questions, setQuestions] = useState([])
	const [responses, setResponses] = useState([])
	const [answers, setAnswers] = useState({})
	const [forms, setForms] = useState([])
	const [uploaded, setUploaded] = useState(false)
	const [redirect, setRedirect] = useState(false)
	const [userData, setUserData] = useState({})
	const [lockButton, setLock] = useState(false)

	const { currentUser } = useContext(AuthContext);
	const { id } = useParams();

	useEffect(() => {
		const getData = async () => {
			let q = []
			let r = []
			let f = []
			let locked = false


			console.log("Fired")
			await firebase.firestore().collection("tasks").doc(id).collection("user_editable").doc("user_editable").get().then(doc => {
				if (doc.data().status === 'complete') {
					locked = true
					setLock(true)
				}
				else {
					locked = false
				}
			})

			await firebase.firestore().collection("tasks").doc(id).collection("questions").get()
				.then((querySnapshot) => {
					querySnapshot.forEach((doc) => {
						// console.log(doc.id, " => ", doc.data());
						q.push({ questionId: doc.id, data: doc.data() })
					});
				})
				.then(() => {
					setQuestions(q)
				})
				.catch((error) => {
					console.log("Error getting documents: ", error);
				});

			await firebase.firestore().collection("tasks").doc(id).collection("responses").get()
				.then((querySnapshot) => {
					querySnapshot.forEach((doc) => {
						// console.log(doc.id, " => ", doc.data());
						r.push({ responseId: doc.id, data: doc.data() })
					});
				})
				.then(() => {
					setResponses(r)
				})
				.catch((error) => {
					console.log("Error getting documents: ", error);
				});


			f = q.map((el, i) => {
				let response = null
				r.forEach((res) => {
					if (el.questionId === res.responseId) {
						response = res.data.answer
						returnAnswer(res.data.answer, i)
						console.log(res.data)
					}
				})
				return <Form key={i} question={el.data} index={i} response={response} returnAnswer={returnAnswer} locked={locked} />
			})
			setForms(f)
		}
		if (currentUser) {
			getData()
		}
	}, [currentUser])


	const returnAnswer = (answer, index) => {
		const tmp = answers
		tmp[index] = answer
		setAnswers(tmp)
		// console.log(answers)
	}

	const saveToFirebase = async (lock) => {
		await questions.forEach(async (q, i) => {
			console.log(q)
			console.log(answers[i])
			if (answers[i] || answers[i] === "") {
				await firebase.firestore().collection("tasks").doc(id).collection("responses").doc(q.questionId).set({ answer: answers[i] })
			}
		})

		if (lock) {
			await firebase.firestore().collection("tasks").doc(id).collection("user_editable").doc("user_editable").update({status: 'complete'})
			setLock(true)
		}
		setUploaded(true)
	}

	return (
		currentUser ?
			<Grid style={{ padding: 30 }}>
				{redirect && <Redirect to="/tasks" />}
				{forms}
				<Grid container style={{ padding: 20 }} justify="center">
					<Button variant="outlined" style={{ borderWidth: 2, borderColor: "grey", color: 'grey', margin: 5 }} onClick={() => setRedirect(true)}>Назад</Button>
					{!lockButton && 
					<div><Button variant="outlined" disabled={lockButton} style={{ borderWidth: 2, borderColor: "#003366", color: '#003366', margin: 5 }} onClick={() => saveToFirebase(false)}>Сохранить</Button>
					<Button variant="outlined" disabled={lockButton} style={{ borderWidth: 2, borderColor: "red", color: 'red', margin: 5 }} onClick={() => saveToFirebase(true)}>Отправить</Button>
					</div>}
				</Grid>

			</Grid>
			:
			<Grid container direction="column" style={{ padding: 20 }} justify="center">
				<Typography align="center" variant="h3">авторизируйтесь</Typography>
				<br />
				<Button variant="contained" onClick={signInWithGoogle}>Войти с помощью аккаунта Google</Button>
			</Grid>
		// <div>
		// 	{forms}
		// </div>
	)

}

export default Profile