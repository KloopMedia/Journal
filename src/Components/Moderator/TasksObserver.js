import React, { useEffect, useState, useContext } from 'react';
import firebase from '../../util/Firebase'
import { AuthContext } from "../../util/Auth";

import Form from '../form/form'
import { Button, Grid, Typography } from '@material-ui/core';

import PaginatedTasks from '../Moderator/PaginatedTasks'

import NativeSelect from '@material-ui/core/NativeSelect';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import Autocomplete from '@material-ui/lab/Autocomplete';
import TextField from '@material-ui/core/TextField';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';

import SearchIcon from '@material-ui/icons/Search';

const TasksObserver = (props) => {

    // console.log('TEST FUNCT')
    // console.log(props)
    const { currentUser } = useContext(AuthContext);

    //TODO load from SCHEMA
    // useEffect(() => {
    //     firebase.firestore().collection('schema').doc('structure').collection('cases')
    // }, [currentUser])
    const taskTypes = ['ВСЕ', 'Поиск контактных данных', 'interview']

    //TODO load from SCHEMA        
    const taskTitles = ['ВСЕ', 'Задание № 1.1', 'Задание № 1.2', 'Задание № 1.3', 'Задание № 2.1', 'Задание № 2.2', 'Задание № 2.3', 'Задание 3.1', 'Задание 3.2', 'Задание 3.3']

    //TODO load from SCHEMA        
    const taskReviewStatuses = ['ВСЕ', 'pending', 'passed', 'not passed', 'verified', 'not verified']

    const [tasks, setTasks] = React.useState([]);
    const [user, setUser] = React.useState('ВСЕ');
    const [users, setUsers] = React.useState([]);
    const [taskType, setTaskType] = React.useState(taskTypes[0]);
    const [taskTitle, setTaskTitle] = React.useState(taskTitles[0]);
    const [taskReviewStatus, setTaskReviewStatus] = React.useState(taskReviewStatuses[0]);

    const setTaskTypeHandler = (event) => {
        setTaskType(event.target.value);
    };

    const setTaskTitleHandler = (event) => {
        setTaskTitle(event.target.value);
    };

    const setUserHandler = (event) => {
        setUser(event.target.value);
    };

    const setTaskReviewStatusHandler = (event) => {
        setTaskReviewStatus(event.target.value);
    };

    const handleClickApplyFilters = (event) => {

        getTasks()

    }


    const getUsers = async () => {
        let usersList = [{ id: '', name: 'NONE', surname: '' }]
        let usersRef = firebase.firestore().collection('users').orderBy("surname")
        await usersRef.get().then(docs => {
            docs.forEach(doc => {
                usersList.push({ id: doc.id, ...doc.data() })
            })

            setUsers(usersList)
        })
    }

    const getTasks = async () => {
        let tasksList = []
        let tasksRef = firebase.firestore().collection('tasks').where("is_complete", "==", true)

        // console.log('USER ID')
        // console.log(user)

        if (user !== 'ВСЕ') {
            tasksRef = tasksRef.where("assigned_users", "array-contains", user)
        }

        if (taskTitle !== 'ВСЕ') {
            tasksRef = tasksRef.where("title", "==", taskTitle)
        }

        if (taskType !== 'ВСЕ') {
            tasksRef = tasksRef.where("type", "==", taskType)
        }

        if (taskReviewStatus !== 'ВСЕ') {
            tasksRef = tasksRef.where("review_status", "==", taskReviewStatus)
        }

        await tasksRef.get().then(docs => {
            docs.forEach(doc => {
                tasksList.push({ id: doc.id, ...doc.data() })
            })

            setTasks(tasksList)
        })
    }

    useEffect(() => {
        getUsers()
    }, [])

    // console.log('USERS')
    // console.log(users)

    return (
        <div>
            {/* <Grid container justify="center">
                <FormControl style={{ width: '350px' }}>
                <NativeSelect
                        value={user.value}
                        onChange={setUserHandler}
                        name="filterUser"
                    //inputProps={{ 'aria-label': 'filterViolation' }}
                    >
                        {
                            users.map(userInfo => (
                                <option value={userInfo.id}> {userInfo.surname} {userInfo.name}</option>
                            ))
                        }
                    </NativeSelect>
                <FormHelperText>Выберите фильтр по users</FormHelperText>
                </FormControl>
            </Grid> */}

            {/* <Grid container justify = "center">
                <FormControl style={{width:'350px'}}>
                <NativeSelect
                    value={taskTitle}
                    onChange={setTaskTitleHandler}
                    name="filterTaskTitle"
                    //inputProps={{ 'aria-label': 'filterViolation' }}
                >
                    {
                        taskTitles.map(taskTitle => (
                        <option value={taskTitle}>{taskTitle}</option>
                    ))
                    }
                </NativeSelect>
                 <FormHelperText>Выберите фильтр по наименованию задачи</FormHelperText>
                </FormControl>
            </Grid>

            <Grid container justify = "center">
                <FormControl style={{width:'350px'}}>
                <NativeSelect
                    value={taskType}
                    onChange={setTaskTypeHandler}
                    name="filterTaskType"
                    //inputProps={{ 'aria-label': 'filterViolation' }}
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

            <Grid container justify = "center">
                <FormControl style={{width:'350px'}}>
                <NativeSelect
                    value={taskReviewStatus}
                    onChange={setTaskReviewStatusHandler}
                    name="filterReviewStatus"
                    //inputProps={{ 'aria-label': 'filterViolation' }}
                >
                    {
                        taskReviewStatuses.map(taskReviewStatus => (
                        <option value={taskReviewStatus}>{taskReviewStatus}</option>
                    ))
                    }
                </NativeSelect>
                 <FormHelperText>Выберите фильтр по review_status</FormHelperText>
                </FormControl>
            </Grid> */}

            <Grid container justify="center" style={{padding: 15}}>
                <Autocomplete
                    id="combo-box-demo"
                    options={users}
                    getOptionLabel={(option) => option.surname + " " + option.name}
                    style={{ width: 300 }}
                    value={user.value}
                    onChange={(event, newValue) => {
                        if (newValue) {
                            setUser(newValue.id)
                        } 
                        else {
                            setUser("")
                        }
                    }}
                    renderInput={(params) => <TextField {...params} fullWidth label="Выберите фильтр по users" variant="outlined" />}
                />
            </Grid>

            <Grid container justify="center">
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
                <PaginatedTasks data={tasks} users={users}></PaginatedTasks>
            </Grid>
        </div>
    );
}

export default TasksObserver