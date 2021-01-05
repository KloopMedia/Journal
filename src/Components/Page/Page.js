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
    const [userStages, setUserStages] = useState({})
    const [userCompleteTasks, setUserCompleteTasks] = useState({})
    const [userIncompleteTasks, setUserIncompleteTasks] = useState({})
    const [filteredStages, setFilteredStages] = useState({})
    const [tabValue, setTabValue] = useState(0)


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
		if (Object.entries(pageData).length > 0 && userRanks.length > 0) {
			pageData.cases.map(pCase => {
				firebase.firestore()
					.collection("schema")
					.doc("structure")
					.collection("cases")
                    .doc(pCase)
                    .collection("stages")
                    .where("ranks_write", "array-contains-any", userRanks)
                    .onSnapshot(snapshot => {
						snapshot.docChanges().forEach(change => {
							if (change.type === "added" || change.type === "modified") {
								setUserStages(prevState => {
									const newState = Object.assign({}, prevState)
                                    if (! newState[pCase]) {
                                        newState[pCase] = {}
                                    }
									newState[pCase][change.doc.id] = change.doc.data()
									console.log("User stages: ", newState)
                                    return newState
								})
                            }
                            if (change.type === "removed") {
                                setUserStages(prevState => {
                                    const newState = Object.assign({}, prevState)
                                    delete newState[pCase][change.doc.id]
                                    return newState
                                })
                            }
						})
					})
			})

            firebase.firestore()
                .collection("tasks")
                .where("assigned_users", "array-contains", currentUser.uid)
                .where("case_type", "in", pageData.cases)
                .where("is_complete", "==", true)
                .onSnapshot(snapshot => {
                    snapshot.docChanges().forEach(change => {
                        if (change.type === "added" || change.type === "modified") {
                            setUserCompleteTasks(prevState => {
                                return {...prevState, [change.doc.id]: change.doc.data()}
                            })
                        }
                        if (change.type === "removed") {
                            setUserCompleteTasks(prevState => {
                                const newState = Object.assign({}, prevState)
                                delete newState[change.doc.id]
                                return newState
                            })
                        }
                    })
                })

            firebase.firestore()
                .collection("tasks")
                .where("assigned_users", "array-contains", currentUser.uid)
                .where("case_type", "in", pageData.cases)
                .where("is_complete", "==", false)
                .onSnapshot(snapshot => {
                    snapshot.docChanges().forEach(change => {
                        if (change.type === "added" || change.type === "modified") {
                            setUserIncompleteTasks(prevState => {
                                return {...prevState, [change.doc.id]: change.doc.data()}
                            })
                        }
                        if (change.type === "removed") {
                            setUserIncompleteTasks(prevState => {
                                const newState = Object.assign({}, prevState)
                                delete newState[change.doc.id]
                                return newState
                            })
                        }
                    })
                })
        }
	}, [currentUser, pageData, userRanks])

    useEffect(() => {
        if (Object.keys(userStages).length > 0) {
            const newFilteredStages = {}
            Object.keys(userStages).map(pCase => {Object.keys(userStages[pCase]).map(stage => {
                if (userStages[pCase][stage].rank_limit_number && Object.keys(userStages[pCase][stage].rank_limit_number).length > 0) {
                    const rankLimitNumberSet = new Set(Object.keys(userStages[pCase][stage].rank_limit_number))
                    const userRanksSet = new Set(userRanks)
                    const setIntersection = intersection(rankLimitNumberSet, userRanksSet)
                    if (setIntersection.size == 0) {
                        if (! newFilteredStages[pCase]) {
                            newFilteredStages[pCase] = {}
                        }
                        newFilteredStages[pCase][stage] = userStages[pCase][stage]
                    } else {
                        if (includeStage(reduceSet(setIntersection, userStages[pCase][stage].rank_limit_number), stage, userCompleteTasks, userIncompleteTasks)) {
                            if (!newFilteredStages[pCase]) {
                                newFilteredStages[pCase] = {}
                            }
                            newFilteredStages[pCase][stage] = userStages[pCase][stage]
                        }
                    }
                } else {
                    if (!newFilteredStages[pCase]) {
                        newFilteredStages[pCase] = {}
                    }
                    newFilteredStages[pCase][stage] = userStages[pCase][stage]
                }
            })
            })

            setFilteredStages(newFilteredStages)
        }
    }, [currentUser, userStages, userIncompleteTasks, userCompleteTasks])

    const includeStage = (number, stage, completeTask, incompleteTasks) => {
	    const stageOccurrences = countStages(stage, completeTask) + countStages(stage, incompleteTasks)
	    console.log("stageOccurrences: ", stageOccurrences)
        console.log("number: ", number)
        if (stageOccurrences < number) {
	        return true
        } else {
	        return false
        }
    }

    const countStages = (stage, tasks) => {
	    let occurrences = 0
        Object.values(tasks).map(task => {
            if (task.case_stage_id === stage) {
                occurrences++
            }
        })
        return occurrences
    }

    const reduceSet = (rSet, limits) => {
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

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };


    return (<Grid container justify="center" alignItems="center" direction="column">
            {/* <Grid>
				<Button onClick={requestTask}>Получить задание</Button>
			</Grid> */}
            {/*<Typography variant="h4">Задания</Typography>*/}
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
                    <Grid key={pCase+stage} style={{padding: 10}}>
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
            {Object.keys(userIncompleteTasks).map(taskId => (
                <Grid key={taskId} style={{padding: 10}}>
                    <TaskCard title={userStages[userIncompleteTasks[taskId].case_type][userIncompleteTasks[taskId].case_stage_id].title}
                              complete={userIncompleteTasks[taskId].is_complete}
                              description={userStages[userIncompleteTasks[taskId].case_type][userIncompleteTasks[taskId].case_stage_id].description}
                              type={taskId}
                              id={taskId}/>
                    </Grid>
                ))}
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
                {Object.keys(userCompleteTasks).map(taskId => (
                    <Grid key={taskId} style={{padding: 10}}>
                        <TaskCard title={userStages[userCompleteTasks[taskId].case_type][userCompleteTasks[taskId].case_stage_id].title}
                                  complete={userCompleteTasks[taskId].is_complete}
                                  description={userStages[userCompleteTasks[taskId].case_type][userCompleteTasks[taskId].case_stage_id].description}
                                  type={taskId}
                                  id={taskId}/>
                    </Grid>
                ))}
            </TabPanel>
           {/* <TabPanel value={value} index={2}>
                быстрые задания
            </TabPanel>*/}
        </Grid>)
}

export default Page