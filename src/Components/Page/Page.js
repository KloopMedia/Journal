import React, { useState, useEffect, useContext, useRef } from 'react'
import firebase, { signInWithGoogle } from '../../util/Firebase'
import { AuthContext } from "../../util/Auth";
import { Redirect, useParams } from 'react-router';
import Box from "@material-ui/core/Box";
import { Grid, Typography, Button } from "@material-ui/core";
import PropTypes from "prop-types";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import TaskCard from "../Tasks/JSchemaCard";
import { cloneDeep } from "lodash"
import CustomFileUpload from "../form/CustomFileUpload";
import JSchemaForm from "@rjsf/bootstrap-4";
import Case from '../Cases/Case'

import { complexStateFirebaseUpdate, simpleStateFirebaseUpdate } from "../../util/Utilities";
import Home from '../Home/Home';

function TabPanel(props) {
    const { children, value, index, ...other } = props;

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
    const [allCases, setAllCases] = useState({})
    const [userTasks, setUserTasks] = useState({})
    const [filteredStages, setFilteredStages] = useState({})
    const [caseData, setCaseData] = useState({})
    const [caseSelector, setCaseSelector] = useState({})
    const [caseSelectorResponse, setCaseSelectorResponse] = useState({})
    //const [unlimStages, setUnlimStages] = useState({})
    const [tabValue, setTabValue] = useState(0)
    const [availableStages, setAvailableStages] = useState({})
    const [bgStages, setBgStages] = useState({})
    const [filterFormData, setFilterFormData] = useState({})
    const [availableTasks, setAvailableTasks] = useState({})
    const [userRanksDescriptions, setUserRanksDescriptions] = useState({})
    const [filterSettings, setFilterSettings] = useState(() => { })
    const [availableRanks, setAvailableRanks] = useState([])


    useEffect(() => {
        // console.log("Page id: ", id)
        // console.log("Current user: ", currentUser)
        let unsubscribe = () => { }
        if (currentUser) {
            unsubscribe = firebase
                .firestore()
                .collection('pages')
                .doc(id)
                .onSnapshot(doc => {
                    setPageData(doc.data())
                    // console.log("Page data: ", doc.data())
                })
        }
        return unsubscribe
    }, [currentUser, id])

    useEffect(() => {
        // console.log("Page id: ", id)
        // console.log("Current user: ", currentUser)
        let unsubscribe = () => { }
        if (currentUser && pageData && pageData.ranks) {
            unsubscribe = firebase
                .firestore()
                .collection('users')
                .doc(currentUser.uid)
                .collection("user_private")
                .doc("private")
                .onSnapshot(doc => {
                    setUserRanks(intersection(doc.data().ranks, pageData.ranks))
                    // console.log("User ranks: ", doc.data().ranks)
                })
        }
        return unsubscribe
    }, [currentUser, id, pageData])


    useEffect(() => {
        if (pageData && Object.entries(pageData).length > 0 && userRanks.length > 0) {
            setUserCases({})
            setUserTasks({})
            setAllCases({})
            setAvailableStages({})
            setAvailableTasks({})
            setBgStages({})
            const casesPath = firebase.firestore()
                .collection("schema")
                .doc("structure")
                .collection("cases")

            pageData.cases.map(pCase => {
                // console.log("PCASE", pCase)
                casesPath.doc(pCase).get().then(doc => {
                    setCaseData(prevState => {
                        const newState = Object.assign({}, prevState)
                        newState[doc.id] = doc.data()
                        return newState
                    })
                })
                casesPath.doc(pCase)
                    .collection("stages")
                    .where("ranks_write", "array-contains-any", userRanks)
                    .onSnapshot(snapshot => {
                        complexStateFirebaseUpdate(snapshot, setUserCases, pCase)
                    })

                casesPath.doc(pCase)
                    .collection("stages")
                    .onSnapshot(snapshot => {
                        complexStateFirebaseUpdate(snapshot, setAllCases, pCase)
                    })
            })
            // console.log("ALLCASES", allCases)
            firebase.firestore()
                .collection("tasks")
                .where("assigned_users", "array-contains", currentUser.uid)
                // .where("case_type", "in", pageData.cases)
                .onSnapshot(snapshot => {
                    // simpleStateFirebaseUpdate(snapshot, setUserTasks)
                    snapshot.docChanges().forEach(change => {
                        if (pageData.cases.includes(change.doc.data().case_type)) {
                            if (change.type === "added" || change.type === "modified") {
                                setUserTasks(prevState => (
                                    { ...prevState, [change.doc.id]: change.doc.data() }
                                ))
                            }
                            if (change.type === "removed") {
                                setUserTasks(prevState => {
                                    const newState = Object.assign({}, prevState)
                                    delete newState[change.doc.id]
                                    return newState
                                })
                            }
                        }
                    })
                })

            if (pageData.caseWithSelectableTasks) {
                casesPath.doc(pageData.caseWithSelectableTasks)
                    .collection("stages")
                    // .where("ranks_read", "array-contains-any", userRanks)
                    .onSnapshot(snapshot => {
                        let allAvaiableStages = {}
                        snapshot.forEach(doc => {
                            if (doc.data().ranks_read) {
                                let available = doc.data().ranks_read.some(rank => userRanks.includes(rank))
                                if (available) {
                                    allAvaiableStages[doc.id] = doc.data()
                                }
                            }
                        })
                        setAvailableStages(allAvaiableStages)
                        
                        // console.log("TMP", tmp)
                        // console.log("TMP", snapshot)
                        // simpleStateFirebaseUpdate(snapshot, setAvailableStages)
                    })

                casesPath.doc(pageData.caseWithSelectableTasks)
                    .collection("stages")
                    .onSnapshot(snapshot => {
                        simpleStateFirebaseUpdate(snapshot, setBgStages)
                    })

                firebase.firestore()
                    .collection("tasks")
                    .where("case_type", "==", pageData.caseWithSelectableTasks)
                    .where("assigned_users", "==", [])
                    .where("available", "==", true)
                    .where("is_complete", "==", false)
                    .where("ranks_read", "array-contains-any", userRanks)
                    .orderBy('created_date', 'desc')
                    .limit(25)
                    .onSnapshot(snapshot => {
                        simpleStateFirebaseUpdate(snapshot, setAvailableTasks)
                    })
            }
        }
    }, [currentUser, pageData, userRanks, id])


    useEffect(() => {
        let fs = () => { }
        if (pageData && Object.entries(pageData).length > 0 && userRanks.length > 0 && pageData.caseWithSelectableTasks) {
            // console.log("filtersData", filterFormData)
            if (Object.keys(filterFormData).length !== 0) {
                const stages = availableStages
                const stageID = Object.keys(stages)[0]
                const stage = stages[stageID]
                const filters = stage.filters
                filters.emergency_form_filling['violationType'] = { violationType: '==' }
                filters.emergency_form_filling['violationTime'] = '=='
                // console.log("filters", filters)
                // console.log("filtersData", filterFormData)
                setAvailableTasks({})
                let collection = firebase.firestore()
                    .collection("tasks")
                let query = collection.where("case_type", "==", pageData.caseWithSelectableTasks)
                    .where("assigned_users", "==", [])
                    .where("available", "==", true)
                    .where("is_complete", "==", false)
                    .where("ranks_read", "array-contains-any", userRanks)

                Object.keys(filters).forEach(stageFilter => {
                    Object.keys(filters[stageFilter]).forEach(filterQuestion => {
                        // console.log(stageFilter, filterQuestion)
                        if (filterFormData[filterQuestion] && filterFormData[filterQuestion][filterQuestion]) {
                            // console.log('filters3', filterFormData[filterQuestion][filterQuestion], filters[stageFilter][filterQuestion][filterQuestion])
                            query = query.where(`cardData.${stageFilter}.${filterQuestion}.${filterQuestion}`, filters[stageFilter][filterQuestion][filterQuestion], filterFormData[filterQuestion][filterQuestion])
                        }
                        else if (filterFormData[filterQuestion] && Object.keys(filterFormData[filterQuestion]).length > 0 && !filterFormData[filterQuestion][filterQuestion]) {
                            // console.log('filters4', filterFormData[filterQuestion], filters[stageFilter][filterQuestion])
                            query = query.where(`cardData.${stageFilter}.${filterQuestion}`, filters[stageFilter][filterQuestion], filterFormData[filterQuestion])
                        }
                    })
                })
                // query = query.where('cardData.emergency_form_filling.violationType.violationType', '==', 'Нарушения в ходе голосования / Добуш берүү убагындагы мыйзам бузуулар')
                // query = query.where('cardData.emergency_form_filling.region.region', '==', 'г. Бишкек')
                // query = query.where('cardData.emergency_form_filling.violationTime', '==', '12:00-13:00')

                query = query.orderBy('created_date', 'desc').limit(25).onSnapshot(snapshot => {
                    simpleStateFirebaseUpdate(snapshot, setAvailableTasks)
                })
                fs = query
            } else {
                setAvailableTasks({})
                fs = firebase.firestore()
                    .collection("tasks")
                    .where("case_type", "==", pageData.caseWithSelectableTasks)
                    .where("assigned_users", "==", [])
                    .where("available", "==", true)
                    .where("is_complete", "==", false)
                    .where("ranks_read", "array-contains-any", userRanks)
                    .orderBy('created_date', 'desc')
                    .limit(25)
                    .onSnapshot(snapshot => {
                        simpleStateFirebaseUpdate(snapshot, setAvailableTasks)
                    })
            }
        }
        return (fs)
    }, [currentUser, pageData, userRanks, id, filterFormData])

    useEffect(() => {
        if (Object.keys(userCases).length > 0) {
            const newFilteredStages = cloneDeep(userCases)
            //let newUnlimStages = {}
            Object.keys(userCases).map(caseID => {
                Object.keys(userCases[caseID]).map(stageId => {
                    const stage = userCases[caseID][stageId]
                    if (stage.ranks_write &&
                        Object.keys(stage.ranks_write).length > 0 &&
                        intersection(stage.ranks_write, userRanks).length > 0 &&
                        "creatable" in stage &&
                        stage.creatable) {
                        if (stage.rank_limit_number && Object.keys(stage.rank_limit_number).length > 0) {
                            const setIntersection = intersection(Object.keys(stage.rank_limit_number), userRanks)
                            if (setIntersection.length > 0) {
                                const maxTasksPerStage = calculatemaxTasksPerStage(setIntersection, stage.rank_limit_number)
                                const tasksPerStage = countTasksPerStage(stageId, userTasks, caseID)
                                // console.log("caseID: ", caseID)
                                // console.log("stageId: ", stageId)
                                // console.log("maxTasksPerStage: ", maxTasksPerStage)
                                // console.log("tasksPerStage: ", tasksPerStage)
                                // if (tasksPerStage >= maxTasksPerStage) {
                                //     console.log("newFilteredStages: ", newFilteredStages)
                                //     delete newFilteredStages[caseID][stageId]
                                //     console.log("newFilteredStages after delete: ", newFilteredStages)
                                // }
                                if (tasksPerStage >= maxTasksPerStage) {
                                    // console.log("newFilteredStages: ", newFilteredStages)
                                    delete newFilteredStages[caseID][stageId]
                                    // console.log("newFilteredStages after delete: ", newFilteredStages)
                                }
                                // console.log("userCases: ", userCases)
                            }
                        }
                    } else {
                        delete newFilteredStages[caseID][stageId]
                    }
                })
            })
            setFilteredStages(newFilteredStages)
            //setUnlimStages(newUnlimStages)
        }
    }, [currentUser, userCases, userTasks, id])


    const countTasksPerStage = (stage, tasks, caseId) => {
        let occurrences = 0
        Object.values(tasks).map(task => {
            if (task.case_stage_id === stage && caseId === task.case_type) {
                occurrences++
            }
        })
        return occurrences
    }

    const calculatemaxTasksPerStage = (rArray, limits) => {
        let largestLimit = 0
        rArray.map(v => {
            if (limits[v] > largestLimit) {
                largestLimit = limits[v]
            }
        })
        return largestLimit
    }

    const intersection = (arrA, arrB) => {
        const setA = new Set(arrA)
        const setB = new Set(arrB)
        let _intersection = new Set()
        for (let elem of setB) {
            if (setA.has(elem)) {
                _intersection.add(elem)
            }
        }
        return [..._intersection]
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
                                return { ...prevState, [change.doc.id]: change.doc.data() }
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

    useEffect(() => {
        if (Object.keys(userCases).length > 0) {
            createCaseSelectorForm()
        }
        else {
            setCaseSelector({})
        }
    }, [userCases])

    const displayTasks = (tasks, stages, cases, cardType, complete) => {
        const displayedTasks = Object.keys(tasks).map(taskId => {
            const caseType = tasks[taskId].case_type
            const stageId = tasks[taskId].case_stage_id

            let stage = false

            if (stages) {
                if (stages[stageId]) {
                    stage = stages[stageId]
                }
            } else if (cases && cases[caseType] && cases[caseType][stageId]) {
                stage = cases[caseType][stageId]
            }

            if (stage && tasks[taskId].is_complete === complete) {
                // console.log("TASKS: ", tasks[taskId])
                // console.log("userStages: ", userCases)
                return <Grid key={taskId} style={{ padding: 10 }}>
                    <TaskCard
                        stage={stage}
                        stageID={stageId}
                        cardType={cardType}
                        task={tasks[taskId]}
                        user={currentUser}
                        pCase={caseType}
                        id={taskId} />
                </Grid>
            }
        })
        return displayedTasks
    }

    const showFilters = (stages, bgStages, formData, handleFormChange) => {
        if (Object.keys(stages).length === 1 &&
            stages[Object.keys(stages)[0]] &&
            stages[Object.keys(stages)[0]].filters &&
            Object.keys(stages[Object.keys(stages)[0]].filters).length > 0 &&
            Object.keys(bgStages).length > 0
        ) {
            const stageID = Object.keys(stages)[0]
            const stage = stages[stageID]
            const filters = stage.filters
            filters.emergency_form_filling['violationType'] = { violationType: '==' }
            filters.emergency_form_filling['violationTime'] = '=='
            const formQuestions = { properties: {} }
            let formUI = {}
            Object.keys(filters).forEach(stageFilter => {
                Object.keys(filters[stageFilter]).forEach(filterQuestion => {
                    let endProps = bgStages[stageFilter].end.properties[filterQuestion]
                    if (endProps) {
                        delete endProps.dependencies
                        formQuestions.properties[filterQuestion] = endProps
                        // console.log("bgStages: ", bgStages)
                        formUI[filterQuestion] = { "ui:widget": "select" }
                    }
                })
            })
            return (
                <JSchemaForm
                    schema={formQuestions}
                    uiSchema={formUI}
                    formData={formData}
                    onChange={e => {
                        handleFormChange(e)
                    }}
                > </JSchemaForm>
            )
        } else return null
    }

    const handleFilterFormChange = (e) => {
        setFilterFormData(e.formData)
        // console.log("FilterFormChange: ", e.formData)
    }


    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };


    const createCaseSelectorForm = () => {
        let schema = {
            type: "object",
            properties: {
                request: {
                    title: "Получить задание",
                    $ref: "#/definitions/cases"
                }
            },
            definitions: {
                cases: {
                    type: "object",
                    properties: {
                        case: {
                            type: "string",
                            enum: ["none", ...Object.keys(userCases)],
                            default: "none"
                        }
                    },
                    required: ['case'],
                    dependencies: {
                        case: {
                            oneOf: [
                                {
                                    properties: {
                                        case: {
                                            enum: [
                                                "none"
                                            ]
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        }

        Object.keys(userCases).forEach((k, i) => {
            let c = userCases[k]
            if (pageData.cases.includes(k)) {
                schema.definitions.cases.dependencies.case.oneOf.push(
                    {
                        properties: {
                            case: {
                                enum: [
                                    k
                                ]
                            },
                            task: {
                                type: "string",
                                enum: ['none', ...Object.keys(c)],
                                default: 'none'
                            }
                        },
                        required: [
                            'task'
                        ]
                    }
                )
            }
        })

        // console.log('schema', schema)
        // console.log('schema', JSON.stringify(schema))
        setCaseSelector(schema)
    }

    const handleFormChange = e => {
        setCaseSelectorResponse(e.formData)
    };

    const requestTask = () => {

        if (caseSelectorResponse.request.case !== 'none' && caseSelectorResponse.request.task !== 'none') {
            firebase.firestore().collection("task_requests").doc(currentUser.uid).collection("requests").add({
                status: "pending",
                user: currentUser.uid,
                case_type: caseSelectorResponse.request.case,
                case_stage_id: caseSelectorResponse.request.task
            })
        }
        else {
            alert('Выберите case и task!')
        }
    }

    useEffect(() => {
        const checkRank = async () => {
            let assignableRanks = []
            await firebase.firestore().collection('schema').doc('structure').collection('ranks').get().then(snap => {
                snap.forEach(doc => {
                    if (pageData.ranks.includes(doc.id) && doc.data().assign_without_moderator) {
                        // console.log("RANK_ID", doc.id)
                        assignableRanks.push(doc.id)
                    }
                })
            })
            return assignableRanks
        }

        const notInUserRanks = (ranks) => {
            return ranks.filter(rank => userRanks && !userRanks.includes(rank))
        }

        if (pageData && pageData.ranks) {
            let assignableRanks = checkRank()
            assignableRanks.then(ranks => setAvailableRanks(notInUserRanks(ranks)))
        }

    }, [pageData, userRanks])

    const requestRank = (rank) => {
        // console.log("Отправляем запрос")
        firebase.firestore().collection('rank_requests').add({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            user_id: currentUser.uid,
            processed: false,
            rank: rank
        })
    }



    return (<Grid container justify="center" alignItems="center" direction="column">
        {/* {console.log("pageData: ", pageData)}
        {console.log("userRanks: ", userRanks)}
        {console.log("userCases: ", userCases)}
        {console.log("userTasks: ", userTasks)}
        {console.log("filteredStages: ", filteredStages)}
        {console.log("availableStages: ", availableStages)}
        {console.log("availableTasks: ", availableTasks)}
        {console.log("caseData", caseData)}
        {console.log("availableRanks: ", availableRanks)} */}

        <Home />

        {availableRanks.length > 0 && <Grid container justify="center" alignItems="center" direction="column" style={{ paddingBottom: 20 }}>
            <Typography variant="h5">{pageData.message}</Typography>
            {availableRanks.map((rank, i) => <Button key={i} variant="contained" color="primary" onClick={() => requestRank(rank)} style={{ margin: 15 }}>Получить ранг {rank}</Button>)}
        </Grid>}

        {pageData.showTaskSelector && <Grid style={{ paddingBottom: 30 }}>
            <JSchemaForm
                schema={caseSelector}
                // uiSchema={formUI}
                formData={caseSelectorResponse}
                onChange={e => {
                    handleFormChange(e)
                }}
                onSubmit={requestTask}
            >
                <button type="submit" className='btn btn-info'>Получить</button>
            </JSchemaForm>
        </Grid>}

        {/* <Grid>
            {Object.keys(userCases).map((k, i) => {
                let c = caseData[k]
                console.log(c)
                if (pageData.cases.includes(k) && c) {
                    return (
                        <Case key={i} title={c.title} description={c.description} caseId={k} userRanks={userRanks} />
                    )
                }
            })}
        </Grid> */}

        {/* <Grid>
				<Button onClick={requestTask}>Получить задание</Button>
			</Grid> */}
        {Object.keys(userRanksDescriptions).length > 0 ? userRanks.map(rank => {
            if (userRanksDescriptions[rank] && userRanksDescriptions[rank].description) {
                return (
                    <Typography variant="h5" key={rank}>{userRanksDescriptions[rank].description}</Typography>
                )
            }
        })
            : null}
        <div className={classes.root}>
            {/*{Object.keys(unlimStages).map(pCase => (*/}
            {/*    Object.keys(unlimStages[pCase]).map(stage => (*/}
            {/*        <Grid key={pCase + stage} style={{padding: 10}}>*/}
            {/*            <TaskCard complete={false}*/}
            {/*                      stage={unlimStages[pCase][stage]}*/}
            {/*                      stageID={stage}*/}
            {/*                      user={currentUser}*/}
            {/*                      pCase={pCase}*/}
            {/*                      cardType = "creatableUnlim"/>*/}
            {/*        </Grid>*/}
            {/*    ))*/}
            {/*))}*/}
            <Paper position="static" color="default">

                <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth" centered
                    aria-label="simple tabs example">
                    <Tab label="Невыполненные" {...a11yProps(0)} />
                    <Tab label="Выполненные" {...a11yProps(1)} />
                    {(Object.keys(availableTasks).length > 0 && Object.keys(availableStages).length > 0) ?
                        <Tab label="Доступные" {...a11yProps(2)} />
                        :
                        null}

                    {/*<Tab label="Быстрые задания" {...a11yProps(3)}/>*/}
                </Tabs>
            </Paper>
        </div>

        <TabPanel value={tabValue} index={0}>
            {Object.keys(filteredStages).map(pCase => (
                Object.keys(filteredStages[pCase]).map(stage => (
                    <Grid key={pCase + stage} style={{ padding: 10 }}>
                        <TaskCard complete={false}
                            stage={filteredStages[pCase][stage]}
                            stageID={stage}
                            user={currentUser}
                            pCase={pCase}
                            cardType="creatable" />
                    </Grid>
                ))
            ))}
            {displayTasks(userTasks, false, allCases, "selected", false)}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
            {displayTasks(userTasks, false, allCases, "selected", true)}
        </TabPanel>

        {(Object.keys(availableTasks).length > 0 && Object.keys(availableStages).length > 0) ?
            <TabPanel value={tabValue} index={2}>
                {/* {console.log("availableTasks: ", availableTasks)} */}
                {showFilters(availableStages, bgStages, filterFormData, handleFilterFormChange)}
                {displayTasks(availableTasks, availableStages, false, "selectable", false)}
            </TabPanel>
            :
            null}
        {/* <TabPanel value={value} index={2}>
                быстрые задания
            </TabPanel>*/}
    </Grid>)
}

export default Page