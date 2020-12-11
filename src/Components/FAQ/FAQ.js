import React, { useEffect, useState, useContext } from 'react';
import firebase from '../../util/Firebase'

import { Button, Grid, makeStyles, Typography } from '@material-ui/core';

import NativeSelect from '@material-ui/core/NativeSelect';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';

import SearchIcon from '@material-ui/icons/Search';
import Card from './Card'


const useStyles = makeStyles((theme) => ({
    select: {
        margin: '20px 0',
        width: 500,
        [theme.breakpoints.down("sm")]: {
            maxWidth: 300
        }
    },

}));

const FAQ = (props) => {

    // console.log('TEST FUNCT')
    // console.log(props)

    //TODO load from SCHEMA
    const classes = useStyles();
    const taskTypes = ['ВСЕ', 'Поиск контактных данных', 'interview']


    const [tasks, setTasks] = React.useState([]);
    const [taskType, setTaskType] = React.useState(taskTypes[0]);
    const [questions, setQuestions] = useState([])

    const setTaskTypeHandler = (event) => {
        setTaskType(event.target.value);
    };

    const handleClickApplyFilters = async (event) => {
        let tasklist = await getTasks()
        getQuestions(tasklist)
    }

    const getTasks = async () => {
        let tasksList = []
        let tasksRef = firebase.firestore().collection('tasks').where('case_type', '==', 'FAQ').where('is_complete', '==', false)

        if (taskType !== 'ВСЕ') {
            tasksRef = tasksRef.where("type", "==", taskType)
        }
        console.log('fired')
        await tasksRef.get().then(docs => {
            docs.forEach(doc => {
                tasksList.push({ id: doc.id, ...doc.data() })
            })
            tasksList.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate())
            setTasks(tasksList)
        })
        return tasksList
    }

    const getQuestions = async (taskList) => {
        let questionList = await taskList.map(async task => {
            let arr = []
            await firebase.firestore().collection('tasks').doc(task.id).collection('questions').get().then(snap => {
                snap.forEach(doc => {
                    arr.push({ taskId: task.id, questionId: doc.id, timestamp: task.timestamp.toDate(), ...doc.data() })
                })
            })
            return arr
        })
        Promise.all(questionList).then(q => setQuestions([].concat.apply([], q)))
    }

    const sendAnswer = (taskId, questionId, answer) => {
        firebase.firestore().collection('tasks').doc(taskId).collection('responses').doc(questionId).set({ answer: answer })
        console.log(taskId, answer)
    }


    return (
        <Grid container justify="center">
            <Grid container justify="center">
                <FormControl className={classes.select}>
                    <NativeSelect
                        value={taskType}
                        onChange={setTaskTypeHandler}
                        name="filterTaskType"
                    >
                        {
                            taskTypes.map((taskType, i) => (
                                <option key={taskType} value={taskType}>{taskType}</option>
                            ))
                        }
                    </NativeSelect>
                    <FormHelperText>Выберите фильтр по типу задачи</FormHelperText>
                </FormControl>
            </Grid>

            <Grid container justify="center" className={classes.select}>
                <Button
                    style={{ width: '350px' }}
                    type='number'
                    variant="contained"
                    onClick={handleClickApplyFilters}
                    color='primary'
                    //className={classes.button}
                    startIcon={<SearchIcon />}
                >
                    Применить фильтры
                </Button>
            </Grid>

            <Grid container justify="center">
                {questions
                    ? questions.map((task, i) => <Card key={'task_' + i} taskId={task.taskId} questionId={task.questionId} title={task.title} sendAnswer={sendAnswer} />)
                    : <Typography style={{ padding: 30 }}>Нет новых вопросов</Typography>}
            </Grid>
        </Grid>
    );
}

export default FAQ