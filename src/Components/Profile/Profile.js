import React, { useState, useEffect, useContext } from 'react'
import firebase, {signInWithGoogle} from '../../util/Firebase'
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

    const { currentUser } = useContext(AuthContext);

    useEffect(() => {
        firebase.firestore().collection("profileTemplate").doc("Template").get().then(doc => {
            setQuestions(doc.data().questions)
            console.log(doc.data().questions)
            const forms = doc.data().questions.map((el, i) => {
                if (el.type === 'input') {
                    return <TextInput key={i} index={i} title={el.question} returnAnswer={returnAnswer} required={el.required} />
                }
                else if (el.type === 'select') {
                    return <SelectBox key={i} index={i} title={el.question} answers={el.answers} returnAnswer={returnAnswer} required={el.required} />
                }
                else if (el.type === 'radio') {
                    return <RadioButton key={i} index={i} title={el.question} answers={el.answers} returnAnswer={returnAnswer} required={el.required} />
                }
                else if (el.type === 'time') {
                    return <TimePickers key={i} index={i} title={el.question} returnAnswer={returnAnswer} required={el.required} />
                }
                else if (el.type === 'checkbox') {
                    return <Checkbox key={i} index={i} title={el.question} answers={el.answers} returnAnswer={returnAnswer} required={el.required} />
                }
                else {
                    return null
                }
            })
            setForms(forms)
        })
    }, [])


    const returnAnswer = (answer, index) => {
        const tmp = answers
        tmp[index] = answer
        setAnswers(tmp)
    }

    const saveToFirebase = () => {
        let mergedAnswers = {}
        questions.forEach((q, i) => {
            if (answers[i]) {
                mergedAnswers[q.key] = answers[i]
            }
        })

        firebase.firestore().collection("users").doc(currentUser.uid).update({
            profileAnswers: answers,
            ...mergedAnswers
        }).then(() => setUploaded(true))
    }

    return (
        currentUser ?
            <div>
                {redirect && <Redirect to="/" />}
                {forms}
                <Grid container style={{ padding: 20 }} justify="center">
                    <Button variant="outlined" style={{ borderWidth: 2, borderColor: "#003366", color: '#003366', margin: 10 }} onClick={saveToFirebase}>Отправить</Button>
                    {uploaded && <Button variant="outlined" style={{ borderWidth: 2, borderColor: "red", color: 'red', margin: 10 }} onClick={() => setRedirect(true)} >На главную</Button>}
                </Grid>

            </div>
            :
            <Grid container direction="column" style={{ padding: 20 }} justify="center">
                <Typography align="center" variant="h3">авторизируйтесь</Typography>
                <br />
                <Button variant="contained" onClick={signInWithGoogle}>Войти с помощью аккаунта Google</Button>
            </Grid>
    )

}

export default Profile