import React, { useEffect, useState, useContext } from 'react';
import firebase from '../../util/Firebase'

import Form from '../form/form'
import { Button, Grid, Typography } from '@material-ui/core';

import UserCard from '../Moderator/UserCard'
import NewForm from './NewForm'


const ModeratedTask = (props) => {

	const [tasks, setTasks] = React.useState([]);
	const [taskInfo, setTaskInfo] = useState({})  
	
	let userInfo = {}

    const [questions, setQuestions] = useState([])    
    const [responses, setResponses] = useState([])    
    const [answers, setAnswers] = useState({})    
    const [forms, setForms] = useState(<div></div>)
    
	const [pending, setPending] = useState(false)
	const [passed, setPassed] = useState(false)
	const [notPassed, setNotPassed] = useState(false)
	const [verified, setVerified] = useState(false)
	const [notVerified, setNotVerified] = useState(false)

	const getReviewStatus = async () => {
        firebase.firestore().collection("tasks").doc(props.task.id).get().then(doc => {
			let review_status
			if (doc.exists && doc.data() && doc.data().review_status) {
				review_status = doc.data().review_status
			}
			else {
				review_status = 'pending'
			}
			console.log("TEST TEST", doc.data())
			
			setPending(review_status === 'pending')
			setPassed(review_status === 'passed')
			setNotPassed(review_status === 'not passed')
			setVerified(review_status === 'verified')
			setNotVerified(review_status === 'not verified')			
        })
	}
	
	const getUserInfo = () => {

		if (taskInfo.assigned_users !== undefined && taskInfo.assigned_users.length > 0){
		
			let item = props.users.find(item => item.id === taskInfo.assigned_users[0])
			if (item !== undefined){
				userInfo = item
			}				
			else{
				userInfo = {}
			}
		}
        
    }

    useEffect(() => {
		const getData = async () => {
			let q = []
			let r = []
			let f = []
			let locked = true


			console.log("HOOK")
			getReviewStatus()		
			
			await firebase.firestore().collection("tasks").doc(props.task.id).get()
				.then(doc => {				
					setTaskInfo(doc.data())
				})
				.catch((error) => {
					console.log("Error getting documents: ", error);
				});

			await firebase.firestore().collection("tasks").doc(props.task.id).collection("questions").get()
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

			await firebase.firestore().collection("tasks").doc(props.task.id).collection("responses").get()
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
		

			//ЗАЛИПУХА!!!
			setForms(<div></div>)	

			f = q.map((el, i) => {
				let response = null
				// console.log(i)
				r.forEach((res) => {
					if (el.questionId === res.responseId) {
						response = res.data.answer
						returnAnswer(res.data.answer, i)
						// console.log(res.data)
					}
				})
				return <Form key={i} question={el.data} index={i} response={response} returnAnswer={returnAnswer} locked={locked} />
			})
			setForms(f)
		}
		if (props.task.id) {
			getData()
		}
	}, [props.task.id])
    
    const returnAnswer = (answer, index) => {
		const tmp = answers
		tmp[index] = answer
		setAnswers(tmp)
		// console.log(answers)
	}

	const handlePending = () => {
		updateReviewStatus('pending')
		getReviewStatus()
	}

	const handlePassed = () => {
		updateReviewStatus('passed')
		getReviewStatus()
	}

	const handleNotPassed = () => {
		updateReviewStatus('not passed')
		getReviewStatus()
	}

	const handleVerified = () => {
		updateReviewStatus('verified')
		getReviewStatus()
	}

	const handleNotVerified = () => {
		updateReviewStatus('not verified')
		getReviewStatus()
	}
	
	const updateReviewStatus = async (review_status) => {
		await firebase.firestore().collection("tasks").doc(props.task.id).update({ review_status: review_status })
	}
    
    // console.log('TEST')
    // console.log(tasks)

	getUserInfo()
	return (
		<Grid style={{ padding: 30 }}>

			{/* <Grid container style={{ padding: 20 }} justify="center">
				<Button variant="contained" color={pending ? "secondary" : '{}'} onClick={handlePending}>
					PENDING
				</Button>
				<Button variant="contained" color={passed ? "secondary" : '{}'} onClick={handlePassed}>
					PASSED
				</Button>
				<Button variant="contained" color={notPassed ? "secondary" : '{}'} onClick={handleNotPassed}>
					NOT PASSED
				</Button>
				<Button variant="contained" color={verified ? "secondary" : '{}'} onClick={handleVerified}>
					VERIFIED
				</Button>
				<Button variant="contained" color={notVerified ? "secondary" : '{}'} onClick={handleNotVerified}>
					NOT VERIFIED
				</Button>
            </Grid> */}

			<Grid container justify = "center">
                <UserCard userInfo={userInfo}> </UserCard>
            </Grid>

            {/* {forms} */}
			<Typography>{"Task ID: " + props.task.id}</Typography>
			<Typography>{"Case ID: " + props.task.case_id}</Typography>
			{/* <Typography>{"Created at:" + props.task.created_date.toDate()}</Typography> */}
			{props.task.is_compete && <Typography>{"Completion time:" + props.task.completion_time.toDate()}</Typography>}
            <NewForm id={props.task.id} />

			</Grid>
	);
}

export default ModeratedTask