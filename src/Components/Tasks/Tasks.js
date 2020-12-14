import React, {useState, useEffect, useContext} from 'react'
import firebase, {signInWithGoogle} from '../../util/Firebase'
import {AuthContext} from "../../util/Auth";
import {Grid, Typography} from '@material-ui/core';
import {makeStyles} from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Box from '@material-ui/core/Box';
import TaskCard from './Card'
import PropTypes from 'prop-types';

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


const Tasks = (props) => {
    const classes = useStyles()
    const [allTasks, setTasks] = useState(null)
    const [submittedTasks, setSubmitted] = useState(null)
    const [quickTasks, setQuickTasks] = useState(null)
    const {currentUser} = useContext(AuthContext);
    const [value, setValue] = useState(0)

    useEffect(() => {
        if (currentUser) {
            let tasks = []
            let submitted = []
            console.log("Fired")
            firebase.firestore().collection("tasks").where("assigned_users", "array-contains", currentUser.uid).get()
                .then((querySnapshot) => {
                    querySnapshot.forEach((doc) => {
                        console.log(doc.id, " => ", doc.data());
                        if (doc.data().is_complete) {
                            submitted.push({id: doc.id, ...doc.data()})
                        } else {
                            tasks.push({id: doc.id, ...doc.data()})
                        }

                    });
                })
                .then(() => {
                    setTasks(tasks)
                    setSubmitted(submitted)
                })
                .catch((error) => {
                    console.log("Error getting documents: ", error);
                });
        }
    }, [currentUser])
    const handleChange = (event, newValue) => {
        setValue(newValue);
    };

    return (
        <Grid container justify="center" alignItems="center" direction="column">
            {/* <Grid>
				<Button onClick={requestTask}>Получить задание</Button>
			</Grid> */}

            {/*<Typography variant="h4">Задания</Typography>*/}
            <div className={classes.root}>
                <Paper position="static" color="default">
                    <Tabs value={value} onChange={handleChange} variant="fullWidth" centered
                          aria-label="simple tabs example">
                        <Tab label="Невыполненные" {...a11yProps(0)}/>
                        <Tab label="Выполненные" {...a11yProps(1)}/>
                        {/*<Tab label="Быстрые задания" {...a11yProps(3)}/>*/}
                    </Tabs>
                </Paper>
            </div>
            <TabPanel value={value} index={0}>
                {allTasks && allTasks.map((task, i) => (
                    <Grid key={'active_task_' + i} style={{padding: 10}}>
                        <TaskCard title={task.title} complete={task.is_complete} description={task.description}
                                  type={task.type} id={task.id}/>
                    </Grid>
                ))}
            </TabPanel>

            <TabPanel value={value} index={1}>
                {submittedTasks && submittedTasks.map((task, i) => (
                    <Grid key={'submitted_task_' + i} style={{padding: 10}}>
                        <TaskCard title={task.title} complete={task.is_complete} description={task.description}
                                  type={task.type} id={task.id}/>
                    </Grid>
                ))}
            </TabPanel>
           {/* <TabPanel value={value} index={2}>
                быстрые задания
            </TabPanel>*/}
        </Grid>
    )
}

export default Tasks