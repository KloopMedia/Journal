import React, { useEffect, useState, useContext } from 'react';
import firebase from '../../util/Firebase'
import { AuthContext } from "../../util/Auth";

import { Button, Grid } from '@material-ui/core';

import PaginatedTasks from '../Moderator/PaginatedTasks'

import Autocomplete from '@material-ui/lab/Autocomplete';
import TextField from '@material-ui/core/TextField';
import SearchIcon from '@material-ui/icons/Search';

const TasksObserver = (props) => {

    const { currentUser } = useContext(AuthContext);

    const [tasks, setTasks] = React.useState([]);
    const [allCases, setCases] = useState([])
    const [allStages, setStages] = useState({})
    const [users, setUsers] = React.useState([]);

    const [user, setUser] = React.useState("");
    const [selectedCase, setSelectedCase] = useState(null)
    const [selectedStage, setSelectedStage] = React.useState(null);
    const [taskId, setTaskId] = useState("")

    const casesPath = firebase.firestore().collection('schema').doc('structure').collection('cases')

    useEffect(() => {
        casesPath.get().then(docs => {
            const cases = []
            docs.forEach(doc => {
                cases.push(doc.id)
            })
            return cases
        }).then(cases => setCases(cases))

    }, [currentUser])

    useEffect(() => {
        setStages(null)
        if (selectedCase) {
            casesPath.doc(selectedCase).collection("stages").get().then(docs => {
                const stages = []
                docs.forEach(doc => {
                    stages.push(doc.id)
                })
                return stages
            }).then(stages => setStages(stages))
        }
    }, [selectedCase])


    const setSelectedCaseHandler = (value) => {
        setSelectedStage(null)
        setSelectedCase(value);
    };

    const setSelectedStageHandler = (value) => {
        setSelectedStage(value);
    };

    const setUserHandler = (value) => {
        setUser(value);
    }

    const handleClickApplyFilters = (event) => {
        getTasks()
    }


    const getUsers = async () => {
        let usersList = []
        let usersRef = firebase.firestore().collection('users')
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
        console.log(user)
        console.log(selectedCase)
        console.log(selectedStage)

        if (user !== "") {
            tasksRef = tasksRef.where("assigned_users", "array-contains", user)
            console.log("USER FIRED", user)
        }

        if (selectedCase !== null) {
            tasksRef = tasksRef.where("case_type", "==", selectedCase)
            console.log("CASE FIRED", selectedCase)
        }

        if (selectedStage !== null) {
            tasksRef = tasksRef.where("case_stage_id", "==", selectedStage)
            console.log("STAGE FIRED", selectedStage)

        }

        if (taskId !== "") {
            firebase.firestore().collection('tasks').doc(taskId).get().then(doc => setTasks([{id:doc.id, ...doc.data()}]))
        }
        else {
            await tasksRef.get().then(docs => {
                docs.forEach(doc => {
                    tasksList.push({ id: doc.id, ...doc.data() })
                })
    
                setTasks(tasksList)
            })
        }
    }

    useEffect(() => {
        getUsers()
    }, [])


    return (
        <div>
            <Grid container justify="center" style={{ padding: 15 }}>
                <Autocomplete
                    id="combo-box-demo"
                    options={allCases}
                    style={{ width: 350 }}
                    disabled={taskId.length > 0}
                    value={selectedCase}
                    onChange={(event, newValue) => setSelectedCaseHandler(newValue)}
                    renderInput={(params) => <TextField {...params} fullWidth label="Выберите фильтр по case" variant="outlined" />}
                />
            </Grid>

            {allStages !== null && allStages.length > 0 && <Grid container justify="center" style={{ padding: 15 }}>
                <Autocomplete
                    id="combo-box-demo"
                    options={allStages}
                    style={{ width: 350 }}
                    disabled={taskId.length > 0}
                    value={selectedStage}
                    onChange={(event, newValue) => setSelectedStageHandler(newValue)}
                    renderInput={(params) => <TextField {...params} fullWidth label="Выберите фильтр по stage" variant="outlined" />}
                />
            </Grid>}

            <Grid container justify="center" style={{ padding: 15 }}>
                <Autocomplete
                    id="combo-box-demo"
                    options={users}
                    getOptionLabel={(option) => option.surname + " " + option.name + " (" + option.username + ")"}
                    style={{ width: 350 }}
                    disabled={taskId.length > 0}
                    value={user.value}
                    onChange={(event, newValue) => {
                        if (newValue) {
                            setUserHandler(newValue.id)
                        }
                        else {
                            setUserHandler("")
                        }
                    }}
                    renderInput={(params) => <TextField {...params} fullWidth label="Выберите фильтр по users" variant="outlined" />}
                />
            </Grid>

            <Grid container justify="center" style={{ padding: 15 }}>
                <TextField
                    style={{ width: 350 }}
                    value={taskId}
                    variant="outlined"
                    label="Введите id таска"
                    onChange={(event, newValue) => setTaskId(event.target.value)}
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