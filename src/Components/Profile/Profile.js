import React, { useState, useEffect, useContext } from 'react'
import firebase, { signInWithGoogle } from '../../util/Firebase'
import { AuthContext } from "../../util/Auth";

import TextInput from "../form/textInput";
import SelectBox from "../form/selectBox";
import RadioButton from "../form/radiobutton";
import TimePickers from "../form/timePickers";
import Checkbox from "../form/checkbox"
import { Button, Grid, Typography } from '@material-ui/core';
import { Redirect } from 'react-router';


const Profile = () => {
    const [questions, setQuestions] = useState([])
    const [answers, setAnswers] = useState({})
    const [forms, setForms] = useState([])
    const [uploaded, setUploaded] = useState(false)
    const [redirect, setRedirect] = useState(false)
    const [userData, setUserData] = useState({})

    const { currentUser } = useContext(AuthContext);

    useEffect(() => {
        let user = {}
        if (currentUser) {
            firebase.firestore().collection("users").doc(currentUser.uid).get().then(doc => {
                setUserData(doc.data())
                user = doc.data()
            }).then(() => {
                firebase.firestore().collection("profileTemplate").doc("Template").get().then(doc => {
                    console.log(JSON.stringify(doc.data()))
                    setQuestions(doc.data().questions)
                    console.log(doc.data().questions)
                    const forms = doc.data().questions.map((el, i) => {
                        let response = null
                        if (user[el.key]) {
                            console.log(user[el.key])
                            response = user[el.key]
                        }
                        if (el.type === 'input') {
                            return <TextInput key={"profile_" + i} index={i} title={el.question} response={response} returnAnswer={returnAnswer} required={el.required} />
                        }
                        else if (el.type === 'select') {
                            return <SelectBox key={"profile_" + i} index={i} title={el.question} response={response} answers={el.answers} returnAnswer={returnAnswer} required={el.required} />
                        }
                        else if (el.type === 'radio') {
                            return <RadioButton key={"profile_" + i} index={i} title={el.question} response={response} answers={el.answers} returnAnswer={returnAnswer} required={el.required} />
                        }
                        else if (el.type === 'time') {
                            return <TimePickers key={"profile_" + i} index={i} title={el.question} response={response} returnAnswer={returnAnswer} required={el.required} />
                        }
                        else if (el.type === 'checkbox') {
                            return <Checkbox key={"profile_" + i} index={i} title={el.question} response={response} answers={el.answers} returnAnswer={returnAnswer} required={el.required} />
                        }
                        else {
                            return null
                        }
                    })
                    setForms(forms)
                })
            })
        }
    }, [currentUser])


    const returnAnswer = (answer, index) => {
        const tmp = answers
        tmp[index] = answer
        setAnswers(tmp)
        console.log(answers)
    }

    const saveToFirebase = () => {
        let mergedAnswers = {}
        questions.forEach((q, i) => {
            if (answers[i]) {
                mergedAnswers[q.key] = answers[i]
            }
        })

        firebase.firestore().collection("users").doc(currentUser.uid).update({
            // profileAnswers: answers,
            ...mergedAnswers
        }).then(() => setUploaded(true))
    }

    // const addCaseId = () => {
    //     firebase.firestore().collection("tasks").where("type", "==", "Поиск контактных данных").get().then(snap => {
    //         snap.forEach( async doc => {
    //             await firebase.firestore().collection("tasks").doc(doc.id).update({case_id: doc.id})
    //             console.log(doc.id)
    //         })
    //     })
    // }

    return (
        currentUser ?
            <Grid style={{ padding: 30 }}>
                {redirect && <Redirect to="/" />}
                {forms}
                <Grid container style={{ padding: 20 }} justify="center">
                    <Button variant="outlined" style={{ borderWidth: 2, borderColor: "#003366", color: '#003366', margin: 10 }} onClick={saveToFirebase}>Отправить</Button>
                    {uploaded && <Button variant="outlined" style={{ borderWidth: 2, borderColor: "red", color: 'red', margin: 10 }} onClick={() => setRedirect(true)} >На главную</Button>}
                </Grid>

            </Grid>
            :
            <Grid container direction="column" style={{ padding: 20 }} justify="center">
                <Typography align="center" variant="h3">авторизируйтесь</Typography>
                <br />
                <Button variant="contained" onClick={signInWithGoogle}>Войти с помощью аккаунта Google</Button>
            </Grid>
    )

}

export default Profile