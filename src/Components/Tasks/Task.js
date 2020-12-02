import React, { useState, useEffect, useContext } from 'react'
import firebase, { signInWithGoogle } from '../../util/Firebase'
import { AuthContext } from "../../util/Auth";

import Form from "../form/form"
import Dialog from "../Dialog/FeedbackDialog"
import Feedback from "../form/feedback"

import { Button, Divider, Grid, Typography } from '@material-ui/core';
import { Redirect, useParams } from 'react-router';
import { Link } from "react-router-dom";


const Tasks = () => {
	const [questions, setQuestions] = useState([])
	const [responses, setResponses] = useState([])
	const [answers, setAnswers] = useState({})
	const [forms, setForms] = useState([])
	const [uploaded, setUploaded] = useState(false)
	const [redirect, setRedirect] = useState(false)
	const [userData, setUserData] = useState({})
	const [lockButton, setLock] = useState(false)
	const [caseTasks, setCaseTasks] = useState([])
	const [dialogState, setDialog] = useState(false)
	const [dialogType, setDialogType] = useState(null)
	const [feedbackValue, setFeedback] = useState({})
	const [releaseFeedbackData, setReleaseFeedbackData] = useState({})

	const { currentUser } = useContext(AuthContext);
	const { id } = useParams();


	useEffect(() => {
		const getQuestions = async (taskID) => {
			let q = []

			await firebase.firestore().collection("tasks").doc(taskID).collection("questions").get()
				.then((querySnapshot) => {
					querySnapshot.forEach((doc) => {
						// console.log(doc.id, " => ", doc.data());
						q.push({ questionId: doc.id, data: doc.data() })
					});
				})
				.catch((error) => {
					console.log("Error getting documents: ", error);
				});

			return q
		}


		const getResponses = async (taskID) => {
			let r = []

			await firebase.firestore().collection("tasks").doc(taskID).collection("responses").get()
				.then((querySnapshot) => {
					querySnapshot.forEach((doc) => {
						// console.log(doc.id, " => ", doc.data());
						r.push({ responseId: doc.id, data: doc.data() })
					});
				})
				.catch((error) => {
					console.log("Error getting documents: ", error);
				});

			return r
		}


		const getSameCaseTasks = async () => {
			let sameCaseTasks = []

			await firebase.firestore().collection("tasks").doc(id).get().then(doc => {
				return doc.data()
			}).then(async data => {
				await firebase.firestore().collection("tasks").where("case_id", "==", data.case_id).get().then(snap => {
					snap.forEach(doc => {
						if (doc.id !== id) {
							console.log(doc.id, '=>', doc.data())
							sameCaseTasks.push({ id: doc.id, ...doc.data() })
						}
					})
				})
			})
			return sameCaseTasks
		}

		const getForms = async () => {
			let f = []
			let locked = true

			setForms(null)


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

			let sq = []
			let sr = []

			let sameCaseTasks = await getSameCaseTasks()
			setCaseTasks(sameCaseTasks)
			if (sameCaseTasks.length > 0) {

				sq = await getQuestions(sameCaseTasks[0].id)
				sr = await getResponses(sameCaseTasks[0].id)
			}

			let sf = sq.map((el, i) => {
				let response = null
				sr.forEach((res) => {
					if (el.questionId === res.responseId) {
						response = res.data.answer
						returnAnswer(res.data.answer, i)
						console.log(res.data)
					}
				})
				return <Form key={el.questionId + '_' + i} question={el.data} index={i} response={response} returnAnswer={returnAnswer} locked={true} askFeedback={true} />
			})

			sf.push(<div key={"div_divider_stripped"} style={{ height: 25, margin: '20px 0', background: 'repeating-linear-gradient( 45deg, white, white 10px, grey 10px, grey 25px)' }}><br /></div>)


			let q = await getQuestions(id)
			let r = await getResponses(id)


			setQuestions(q)
			setResponses(r)


			// let newQ = sq.concat(q)
			// let newR = sr.concat(r)

			f = q.map((el, i) => {
				let response = null
				r.forEach((res) => {
					if (el.questionId === res.responseId) {
						response = res.data.answer
						returnAnswer(res.data.answer, i)
						console.log(res.data)
					}
				})
				return <Form key={el.questionId + '_' + i} question={el.data} index={i} response={response} returnAnswer={returnAnswer} locked={locked} />
			})

			let newF = sf.concat(f)
			setForms(newF)
		}
		if (currentUser) {

			getForms()
		}
	}, [currentUser, id, lockButton])


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
			await firebase.firestore().collection("tasks").doc(id).collection("user_editable").doc("user_editable").update({ status: 'complete' })
			setLock(true)
			setDialog(false)
		}
		setUploaded(true)
	}

	const handleDialogClose = () => {
		setDialog(false);
		setFeedback({})
	};

	const handleDialogOpen = (type) => {
		if (type === 'send') {
			setDialogType('send')
			setDialog(true)
		}
		if (type === 'release') {
			setDialogType('release')
			setDialog(true)
		}

	}

	useEffect(() => {
		firebase.firestore().collection("schema").doc("structure").collection("feedbacks").doc("release").get().then(doc => {
			console.log("FEEDBACK", doc.data())
			setReleaseFeedbackData(doc.data())
		})
	}, [])

	const releaseTask = () => {
		firebase.firestore().collection("tasks").doc(id).collection("user_editable").doc("user_editable").update({ status: 'open' })
			.then(() => firebase.firestore().collection("tasks").doc(id).collection("user_editable").doc("user_editable").update({ status: 'released', release_status: feedbackValue.reason, release_description: feedbackValue.text })
				.then(() => {
					setDialog(false)
					setLock(true)
				}))
		// alert(feedbackValue)
	}

	const handleFeedbackSave = (value) => {
		setFeedback(value)
	}

	return (
		currentUser ?
			<Grid style={{ padding: 30 }}>
				{dialogType === 'send' && <Dialog state={dialogState} handleClose={handleDialogClose} title={"Отправить задание?"} content={"Вы собираетесь отправить задание. Это значит, что вы больше не сможете изменять ответы."} dialogFunction={() => saveToFirebase(true)} />}
				{dialogType === 'release' && <Dialog
					state={dialogState}
					feedbackValue={feedbackValue}
					handleClose={handleDialogClose}
					title={releaseFeedbackData.title}
					dialogFunction={releaseTask}
					answers={releaseFeedbackData.answers}
					description={releaseFeedbackData.description}
					returnFeedback={handleFeedbackSave} />}
				{redirect && <Redirect to="/tasks" />}
				{/* Предыдущие задания{caseTasks.map((t, i) => <Button key={"case_button_"+i} component={ Link } to={"/tasks/" + t.id}>{t.title}</Button>)} */}
				{forms}
				<Grid container style={{ padding: 20 }} justify="center">
					<Button variant="outlined" style={{ borderWidth: 2, borderColor: "grey", color: 'grey', margin: 5 }} onClick={() => setRedirect(true)}>Назад</Button>
					{!lockButton &&
						<div>
							<Button variant="outlined" disabled={lockButton} style={{ borderWidth: 2, borderColor: "#003366", color: '#003366', margin: 5 }} onClick={() => saveToFirebase(false)}>Сохранить</Button>
							<Button variant="outlined" disabled={lockButton} style={{ borderWidth: 2, borderColor: "red", color: 'red', margin: 5 }} onClick={() => handleDialogOpen('send')}>Отправить</Button>
							<Button variant="outlined" disabled={lockButton} style={{ borderWidth: 2, borderColor: "red", color: 'red', margin: 5 }} onClick={() => handleDialogOpen('release')}>Освободить</Button>
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

export default Tasks