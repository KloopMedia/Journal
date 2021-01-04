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


    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };


    return (<Grid container justify="center" alignItems="center" direction="column">
            {/* <Grid>
				<Button onClick={requestTask}>Получить задание</Button>
			</Grid> */}
        {console.log("userCompleteTasks: ", userCompleteTasks)}
        {console.log("userIncompleteTasks: ", userIncompleteTasks)}
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
                {Object.keys(userIncompleteTasks).map(taskId => (
                     <Grid key={taskId} style={{padding: 10}}>
                        <div>{userIncompleteTasks[taskId].title}</div>
                        <TaskCard title={userIncompleteTasks[taskId].title} complete={userIncompleteTasks[taskId].is_complete} description={userIncompleteTasks[taskId].description}
                                  type={userIncompleteTasks[taskId].type} id={taskId}/>
                    </Grid>
                ))}
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
                {Object.keys(userCompleteTasks).map(taskId => (
                    <Grid key={taskId} style={{padding: 10}}>
                        <TaskCard title={userCompleteTasks[taskId].title} complete={userCompleteTasks[taskId].is_complete} description={userCompleteTasks[taskId].description}
                                  type={userCompleteTasks[taskId].type} id={taskId}/>
                    </Grid>
                ))}
            </TabPanel>
           {/* <TabPanel value={value} index={2}>
                быстрые задания
            </TabPanel>*/}
        </Grid>)
}

export default Page