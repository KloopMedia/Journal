import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../util/Auth';
import firebase, { signInWithGoogle } from '../../util/Firebase'
import clsx from 'clsx';
import { makeStyles, useTheme, withStyles } from '@material-ui/core/styles';
import Drawer from '@material-ui/core/Drawer';
import CssBaseline from '@material-ui/core/CssBaseline';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import Button from '@material-ui/core/Button';
import { Badge, Card, CardActions, CardContent, Typography } from '@material-ui/core';
import Grid from '@material-ui/core/Grid'
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import MuiMenuItem from '@material-ui/core/MenuItem';
import AddIcon from '@material-ui/icons/Add';
import Menu from '@material-ui/core/Menu';
import Avatar from '@material-ui/core/Avatar';
import Divider from '@material-ui/core/Divider';
import InputLabel from '@material-ui/core/InputLabel';
import MenuIcon from '@material-ui/icons/Menu'
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft'
import ChevronRightIcon from '@material-ui/icons/ChevronRight'
import KloopLogo from '../../kloop_transparent_site.png'
import NotificationsIcon from '@material-ui/icons/Notifications';

import {
    Link
} from "react-router-dom";

const drawerWidth = 220;

const useStyles = makeStyles((theme) => ({
    root: {
        display: 'flex',
    },
    appBar: {
        background: 'white',
        boxShadow: 'none',
        transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
    },
    appBarShift: {
        width: `calc(100% - ${drawerWidth}px)`,
        marginLeft: drawerWidth,
        transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
        }),
    },
    menuButton: {
        color: 'gray',
        marginRight: theme.spacing(2),
    },
    hide: {
        display: 'none',
    },
    drawer: {
        width: drawerWidth,
        flexShrink: 0,
    },
    drawerPaper: {
        width: drawerWidth,
    },
    drawerHeader: {
        display: 'flex',
        alignItems: 'center',
        padding: theme.spacing(0, 1),
        // necessary for content to be below app bar
        ...theme.mixins.toolbar,
        justifyContent: 'flex-end',
    },
    content: {
        flexGrow: 1,
        padding: theme.spacing(3),
        transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
        marginLeft: -drawerWidth,
    },
    contentShift: {
        transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
        }),
        marginLeft: 0,
    },
    small: {
        width: theme.spacing(4),
        height: theme.spacing(4),
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 120,
    },
    message: {
		width: 350,
		[theme.breakpoints.down("sm")] : {
			maxWidth: '95%' 
		}
    }
}));

const MenuItem = withStyles({
    root: {
        justifyContent: "flex-end"
    }
})(MuiMenuItem);

export default function PersistentDrawerLeft(props) {
    const { currentUser } = useContext(AuthContext);
    const classes = useStyles();
    const theme = useTheme();
    const [open, setOpen] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false)
    const [anchorEl, setAnchorEl] = React.useState(null);
    const menuOpen = Boolean(anchorEl);

    const [moderator, setModerator] = useState(false)
    const [numOfMessages, setNumOfMessages] = useState(0)
    const [messages, setMessages] = useState([])

    useEffect(() => {
        firebase.firestore().collection('editors').get().then((snap) => {
            snap.forEach(doc => {
                if (doc.id === currentUser.uid) {
                    console.log('moderator')
                    setModerator(true)
                }
            })
        }).catch(() => setModerator(false))
    }, [currentUser])

    useEffect(() => {
        if (currentUser) {
            const unsubscribe = firebase.firestore().collection('notifications').where('user_id', '==', currentUser.uid).onSnapshot(async snap => {
                console.log(snap.size)
                let m = []
                let count = 0
                snap.forEach(doc => {
                    if (!doc.data().shown) {
                        m.push({ id: doc.id, ...doc.data() })
                        count++
                    }
                })
                setNumOfMessages(count)
                setMessages(m)
            })
            return () => unsubscribe()
        }
    }, [currentUser])

    const updateFirestoreStatus = (id, index) => {
        firebase.firestore().collection('notifications').doc(id).update({ shown: true })
    }

    const handleDrawerOpen = () => {
        setOpen(true);
    };

    const handleDrawerClose = () => {
        setOpen(false);
    };

    const handleDialogOpen = () => {
        setDialogOpen(true)
    }

    const handleDialogClose = () => {
        setDialogOpen(false);
    };

    const handleMenu = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null)
    }

    //   const copyToClipboard = (text) => {
    //     let data = JSON.stringify(text)
    //     console.log(data)
    //     navigator.clipboard.writeText(data)
    //   }

    return (
        <div className={classes.root}>
            <CssBaseline />
            <AppBar
                position="fixed"
                className={clsx(classes.appBar, {
                    [classes.appBarShift]: open,
                })}
            >
                <Toolbar style={{ paddingLeft: 15, paddingRight: 15 }}>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        onClick={handleDrawerOpen}
                        edge="start"
                        className={clsx(classes.menuButton, open && classes.hide)}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Grid container style={{ flexGrow: 1 }}>
                        <img src={KloopLogo} alt="Kloop.kg - Новости Кыргызстана" style={{ width: 150, height: 'auto' }} />
                        {/* <img src="https://kloop.kg/wp-content/uploads/2017/01/kloop_transparent_site.png" alt="Kloop.kg - Новости Кыргызстана" style={{ width: 150, height: 'auto' }} /> */}
                        {/* <Typography variant="h5" style={{ color: "black" }}>Journal</Typography> */}
                    </Grid>
                    {currentUser &&
                        <div>
                            <IconButton
                                aria-label="account of current user"
                                aria-controls="menu-appbar"
                                aria-haspopup="true"
                                onClick={handleMenu}
                                color="inherit"
                                size="small"
                            >
                                <Badge badgeContent={numOfMessages} color="secondary" overlap="circle" >
                                    <NotificationsIcon style={{ fill: 'grey', fontSize: '28px' }} />
                                </Badge>
                            </IconButton>
                            <Menu
                                id="menu-appbar"
                                anchorEl={anchorEl}
                                anchorOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                                keepMounted
                                transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                                open={menuOpen}
                                onClose={handleMenuClose}
                            >
                                <Grid container direction="column" alignItems="center" >
                                    {messages.length > 0 ? messages.map(message => (
                                        <Grid container className={classes.message} justify="flex-start" style={{padding: 0}}>
                                                <Typography style={{flex: 1, padding: 10}}>{message.title}</Typography>
                                                <Button style={{padding: 10}} onClick={() => updateFirestoreStatus(message.id)} size="small">скрыть</Button>
                                        </Grid>
                                    )): <Typography className={classes.message} align="center" style={{padding: 10}}>Нет новых уведомлений</Typography>}
                                </Grid>
                            </Menu>
                        </div>}
                    {currentUser
                        ?
                        <Button style={{ borderColor: "black", color: 'black', marginLeft: 10, fontSize: 12 }} variant="outlined" size="small" onClick={() => firebase.auth().signOut()}>Выход</Button>
                        : <Button style={{ borderColor: "black", color: 'black', marginLeft: 10, fontSize: 12 }} size="small" variant="outlined" onClick={signInWithGoogle}>вход</Button>
                    }
                </Toolbar>
            </AppBar>
            <Drawer
                className={classes.drawer}
                variant="persistent"
                anchor="left"
                open={open}
                classes={{
                    paper: classes.drawerPaper,
                }}
            >
                <div className={classes.drawerHeader}>
                    <IconButton onClick={handleDrawerClose}>
                        {theme.direction === 'ltr' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                    </IconButton>
                </div>
                <Divider />
                <nav>
                    <ul>
                        <li>
                            <Link to="/">Главная</Link>
                        </li>
                        <li>
                            <Link to="/profile">Профиль</Link>
                        </li>
                        <li>
                            <Link to="/tasks">Задания</Link>
                        </li>
                        <li>
                            <Link to="/request">Получить задание</Link>
                        </li>
                        <li>
                            <Link to="/notifications">Уведомления</Link>
                        </li>
                        {moderator ? <li>
                            <Link to="/tasksObserver">Модератор</Link>
                        </li> : null}
                    </ul>
                </nav>
            </Drawer>
            <main style={{ padding: 0, height: '100%', background: 'transparent' }}
                className={clsx(classes.content, {
                    [classes.contentShift]: open,
                })}
            >
                <div className={classes.drawerHeader} />
                {props.children}
            </main>
        </div>
    );
}
