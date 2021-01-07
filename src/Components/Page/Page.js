import React, { useState, useEffect, useContext, useRef } from 'react'
import firebase, { signInWithGoogle } from '../../util/Firebase'
import { AuthContext } from "../../util/Auth";
import { Redirect, useParams } from 'react-router';
import Box from "@material-ui/core/Box";
import {Grid, Typography} from "@material-ui/core";
import PropTypes from "prop-types";
import {makeStyles} from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import TaskCard from "../Tasks/JSchemaCard";
import { cloneDeep } from "lodash"

function TabPanel(props) {
    const {children, value, index, ...other} = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`full-width-tabpanel-${index}`}
            aria-labelledby={`full-width-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box p={3}>
                    <Typography>{children}</Typography>
                </Box>
            )}
        </div>
    );
}

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.any.isRequired,
    value: PropTypes.any.isRequired,
};

function a11yProps(index) {
    return {
        id: `full-width-tab-${index}`,
        'aria-controls': `full-width-tabpanel-${index}`,
    };
}


const useStyles = makeStyles({
    root: {
        paddingTop: 30,
        flexGrow: 1
    },
});

const Page = () => {
    const { currentUser } = useContext(AuthContext);
	const { id } = useParams();

	const classes = useStyles()

	const [pageData, setPageData] = useState({})
    const [userRanks, setUserRanks] = useState([])
    const [userCases, setUserCases] = useState({})
    const [userTasks, setUserTasks] = useState({})
    const [filteredStages, setFilteredStages] = useState({})
    const [tabValue, setTabValue] = useState(0)
    const [userRanksDescriptions, setUserRanksDescriptions] = useState({})


	useEffect(() => {
		console.log("Page id: ", id)
        console.log("Current user: ", currentUser)
        if (currentUser) {
            firebase
                .firestore()
                .collection('pages')
                .doc(id)
                .onSnapshot(doc => {
                    setPageData(doc.data())
                    console.log("Page data: ", doc.data())
                })
            firebase
                .firestore()
                .collection('users')
                .doc(currentUser.uid)
                .collection("user_private")
                .doc("private")
                .onSnapshot(doc => {
                    setUserRanks(doc.data().ranks)
                    console.log("User ranks: ", doc.data().ranks)
                })
        }
    }, [currentUser, id])

    useEffect(() => {
		if (pageData && Object.entries(pageData).length > 0 && userRanks.length > 0) {
			pageData.cases.map(pCase => {
				firebase.firestore()
					.collection("schema")
					.doc("structure")
					.collection("cases")
                    .doc(pCase)
                    .collection("stages")
                    .where("ranks_write", "array-contains-any", userRanks)
                    .onSnapshot(snapshot => {
						complexStateFirebaseUpdate(snapshot, setUserCases, pCase)
					})
			})

            firebase.firestore()
                .collection("tasks")
                .where("assigned_users", "array-contains", currentUser.uid)
                .where("case_type", "in", pageData.cases)
                .onSnapshot(snapshot => {
                    snapshot.docChanges().forEach(change => {
                        if (change.type === "added" || change.type === "modified") {
                            setUserTasks(prevState => (
                                {...prevState, [change.doc.id]: change.doc.data()}
                            ))
                        }
                        if (change.type === "removed") {
                            setUserTasks(prevState => {
                                const newState = Object.assign({}, prevState)
                                delete newState[change.doc.id]
                                return newState
                            })
                        }
                    })
                })
        }
	}, [currentUser, pageData, userRanks])

    const complexStateFirebaseUpdate = (snapshot, setFunction, subState) => {
        snapshot.docChanges().forEach(change => {
            if (change.type === "added" || change.type === "modified") {
                setFunction(prevState => {
                    const newState = Object.assign({}, prevState)
                    if (!newState[subState]) {
                        newState[subState] = {}
                    }
                    newState[subState][change.doc.id] = change.doc.data()
                    console.log("User stages: ", newState)
                    return newState
                })
            }
            if (change.type === "removed") {
                setFunction(prevState => {
                    const newState = Object.assign({}, prevState)
                    delete newState[subState][change.doc.id]
                    return newState
                })
            }
        })
    }

    useEffect(() => {
        if (Object.keys(userCases).length > 0) {
            const newFilteredStages = cloneDeep(userCases)
            Object.keys(userCases).map(caseID => {
                Object.keys(userCases[caseID]).map(stageId => {
                    const stage = userCases[caseID][stageId]
                    if (stage.rank_limit_number && Object.keys(stage.rank_limit_number).length > 0) {
                        const setIntersection = intersection(new Set(Object.keys(stage.rank_limit_number)),
                            new Set(userRanks))
                        const maxTasksPerStage = calculatemaxTasksPerStage(setIntersection, stage.rank_limit_number)
                        const tasksPerStage = countTasksPerStage(stageId, userTasks)
                        console.log("caseID: ", caseID)
                        console.log("stageId: ", stageId)
                        console.log("maxTasksPerStage: ", maxTasksPerStage)
                        console.log("tasksPerStage: ", tasksPerStage)
                        if (tasksPerStage > maxTasksPerStage) {
                            console.log("newFilteredStages: ", newFilteredStages)
                            delete newFilteredStages[caseID][stageId]
                            console.log("newFilteredStages after delete: ", newFilteredStages)
                        }
                        if (tasksPerStage > maxTasksPerStage || !("creatable" in stage) || !(stage.creatable)) {
                            console.log("newFilteredStages: ", newFilteredStages)
                            delete newFilteredStages[caseID][stageId]
                            console.log("newFilteredStages after delete: ", newFilteredStages)
                        }
                        console.log("userCases: ", userCases)
                    }
                })
            })
        setFilteredStages(newFilteredStages)
        }
    }, [currentUser, userCases, userTasks])


    const countTasksPerStage = (stage, tasks) => {
	    let occurrences = 0
        Object.values(tasks).map(task => {
            if (task.case_stage_id === stage) {
                occurrences++
            }
        })
        return occurrences
    }

    const calculatemaxTasksPerStage = (rSet, limits) => {
        let largestLimit = 0
        const rArray = [...rSet]
        rArray.map(v => {
            if (limits[v] > largestLimit) {
                largestLimit = limits[v]
            }
        })
        return largestLimit
    }

    const intersection = (setA, setB) => {
        let _intersection = new Set()
        for (let elem of setB) {
            if (setA.has(elem)) {
                _intersection.add(elem)
            }
        }
        return _intersection
    }

    useEffect(() => {
        if (userRanks.length > 0) {
            firebase.firestore()
                .collection("schema")
                .doc("structure")
                .collection("ranks")
                .where(firebase.firestore.FieldPath.documentId(), "in", userRanks)
                .onSnapshot(snapshot => {
                    snapshot.docChanges().forEach(change => {
                        if (change.type === "added" || change.type === "modified") {
                            setUserRanksDescriptions(prevState => {
                                return {...prevState, [change.doc.id]: change.doc.data()}
                            })
                        }
                        if (change.type === "removed") {
                            setUserRanksDescriptions(prevState => {
                                const newState = Object.assign({}, prevState)
                                delete newState[change.doc.id]
                                return newState
                            })
                        }
                    })
                })
        }
    }, [userRanks])

    const displayTasks = (tasks, complete) => {
        const displayedTasks = Object.keys(tasks).map(taskId => {
            const caseType = tasks[taskId].case_type
            const stageId = tasks[taskId].case_stage_id

            if (userCases[caseType] &&
                userCases[caseType][stageId] &&
                tasks[taskId].is_complete === complete) {
                console.log("TASKS: ", tasks[taskId])
                console.log("userStages: ", userCases)
                return <Grid key={taskId} style={{padding: 10}}>
                    <TaskCard
                        title={userCases[caseType][stageId].title}
                        complete={userTasks[taskId].is_complete}
                        description={userCases[caseType][stageId].description}
                        type={taskId}
                        id={taskId}/>
                </Grid>
            }
        })
        return displayedTasks
    }



    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };


    return (<Grid container justify="center" alignItems="center" direction="column">
        {/* <Grid>
				<Button onClick={requestTask}>Получить задание</Button>
			</Grid> */}
        {Object.keys(userRanksDescriptions).map(rank => (
            <Typography variant="h5">{userRanksDescriptions[rank].description}</Typography>
        ))}
        <div className={classes.root}>
            <Paper position="static" color="default">
                <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth" centered
                      aria-label="simple tabs example">
                    <Tab label="Невыполненные" {...a11yProps(0)}/>
                    <Tab label="Выполненные" {...a11yProps(1)}/>
                    {/*<Tab label="Быстрые задания" {...a11yProps(3)}/>*/}
                </Tabs>
            </Paper>
        </div>
        <TabPanel value={tabValue} index={0}>
            {Object.keys(filteredStages).map(pCase => (
                Object.keys(filteredStages[pCase]).map(stage => (
                    <Grid key={pCase + stage} style={{padding: 10}}>
                        <TaskCard title={filteredStages[pCase][stage].title}
                                  complete={false}
                                  description={filteredStages[pCase][stage].description}
                                  type={"Новая"}
                                  pCase={pCase}
                                  stage={stage}
                                  user={currentUser}
                                  id={""}
                                  creatable={true}/>
                    </Grid>
                ))
            ))}
            {displayTasks(userTasks, false)}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
            {displayTasks(userTasks, true)}
        </TabPanel>
        {/* <TabPanel value={value} index={2}>
                быстрые задания
            </TabPanel>*/}
    </Grid>)
}

export default Page