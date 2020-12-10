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

    const setTaskTypeHandler = (event) => {
        setTaskType(event.target.value);
    };

    const handleClickApplyFilters = (event) => {
        getTasks()
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
                // doc.ref.collection('questions').get().then(snap => {
                //     snap.forEach(taskData => )
                // })
                tasksList.push({ id: doc.id, ...doc.data() })
            })
            console.log(tasksList)
            setTasks(tasksList)
        })
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
                            taskTypes.map(taskType => (
                                <option value={taskType}>{taskType}</option>
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
                {tasks.map((task, i) => <Card key={'FAQ_' + i} title="test" />)}
                {tasks.length === 0 && <Typography style={{ padding: 30}}>Нет новых вопросов</Typography>}
                {/* <Card key={'FAQ'} title="test" /> */}
            </Grid>
        </Grid>
    );
}

export default FAQ