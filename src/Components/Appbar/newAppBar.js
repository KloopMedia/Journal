import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../util/Auth';
import firebase, { signInWithGoogle } from '../../util/Firebase'
import PropTypes from 'prop-types';
import AppBar from '@material-ui/core/AppBar';
import CssBaseline from '@material-ui/core/CssBaseline';
import Divider from '@material-ui/core/Divider';
import Drawer from '@material-ui/core/Drawer';
import Hidden from '@material-ui/core/Hidden';
import IconButton from '@material-ui/core/IconButton';
import InboxIcon from '@material-ui/icons/MoveToInbox';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import MailIcon from '@material-ui/icons/Mail';
import MenuIcon from '@material-ui/icons/Menu';
import Menu from '@material-ui/core/Menu';
import Toolbar from '@material-ui/core/Toolbar';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import KloopLogo from '../../kloop_transparent_site.png'
import NotificationsIcon from '@material-ui/icons/Notifications';
import { Badge } from '@material-ui/core';
import Grid from '@material-ui/core/Grid'

import {
	Link
} from "react-router-dom";

const drawerWidth = 240;

const useStyles = makeStyles((theme) => ({
	root: {
		display: 'flex',
	},
	drawer: {
		[theme.breakpoints.up('sm')]: {
			width: drawerWidth,
			flexShrink: 0,
		},
	},
	appBar: {
		background: 'white',
		boxShadow: 'none',
		[theme.breakpoints.up('sm')]: {
			width: `calc(100% - ${drawerWidth}px)`,
			marginLeft: drawerWidth,
		},
	},
	menuButton: {
		color: 'black',
		marginRight: theme.spacing(2),
		[theme.breakpoints.up('sm')]: {
			display: 'none',
		},
	},
	// necessary for content to be below app bar
	toolbar: theme.mixins.toolbar,
	drawerPaper: {
		width: drawerWidth,
	},
	content: {
		flexGrow: 1,
		padding: theme.spacing(3),
	},
}));

function ResponsiveDrawer(props) {
	const { window } = props;
	const classes = useStyles();
	const theme = useTheme();
	const [mobileOpen, setMobileOpen] = React.useState(false);
	const { currentUser } = useContext(AuthContext);
	const [anchorEl, setAnchorEl] = React.useState(null);
	const menuOpen = Boolean(anchorEl);

	const handleDrawerToggle = () => {
		setMobileOpen(!mobileOpen);
	};


	const [moderator, setModerator] = useState(false)
	const [numOfMessages, setNumOfMessages] = useState(0)
	const [messages, setMessages] = useState([])
	const [userRanks, setUserRanks] = useState([])
	const [userPages, setUserPages] = useState({})
	const [availableRanks, setAvailableRanks] = useState([])

	useEffect(() => {
		if (currentUser) {
			firebase.firestore().collection('editors').get().then((snap) => {
				snap.forEach(doc => {
					if (doc.id === currentUser.uid) {
						console.log('moderator')
						setModerator(true)
					}
				})
			}).catch(() => setModerator(false))
		}
	}, [currentUser])

	useEffect(() => {
		if (currentUser) {
			firebase
				.firestore()
				.collection('users')
				.doc(currentUser.uid)
				.collection("user_private")
				.doc("private")
				.onSnapshot(doc => {
					if (doc.data()) {
						setUserRanks(doc.data().ranks)
					}
				})
		}
	}, [currentUser])

	useEffect(() => {
		if (currentUser) {
			firebase
				.firestore()
				.collection('schema')
				.doc('structure')
				.collection("ranks")
				.onSnapshot(snap => {
					let assignableRanks = []
					snap.forEach(doc => {
						if (doc.data().assign_without_moderator) {
							assignableRanks.push(doc.id)
						}
					})
					setAvailableRanks(assignableRanks)
					console.log("Assignable", assignableRanks)
				})
		}
	}, [currentUser])

	useEffect(() => {
		if (userRanks.length > 0) {
			let ranks = [...userRanks, ...availableRanks]
			console.log('all_ranks', ranks)
			firebase
				.firestore()
				.collection('pages')
				.where("ranks", "array-contains-any", ranks)
				.onSnapshot(snapshot => {
					snapshot.docChanges().forEach(change => {
						if (change.type === "added" || change.type === "modified") {
							setUserPages(prevState => {
								return { ...prevState, [change.doc.id]: change.doc.data() }
							})
							console.log("User pages: ", change.doc.id)
						}
					})
				})
		}
	}, [userRanks])


	useEffect(() => {
		let unsubscribe = () => { }
		if (currentUser) {
			firebase.firestore()
				.collection('notifications')
				.where('user_id', 'array-contains', currentUser.uid)
				.where('shown', '!=', true)
				.onSnapshot(snap => {
					console.log(snap.size)
					let m = []
					let count = 0
					snap.forEach(doc => {
						m.push({ id: doc.id, ...doc.data() })
						count++
					})
					m.sort((a, b) => b.created_date.toDate() - a.created_date.toDate())
					setNumOfMessages(count)
					setMessages(m)
				})
		}
		return () => unsubscribe
	}, [currentUser])

	const updateFirestoreStatus = (id, index) => {
		firebase.firestore().collection('notifications').doc(id).update({ shown: true })
	}

	const handleMenu = (event) => {
		setAnchorEl(event.currentTarget);
	};

	const handleMenuClose = () => {
		setAnchorEl(null)
	}

	const drawer = (
		<div>
			<div className={classes.toolbar} />
			<Divider />
			<nav>
				<ul>
					<li>
						<Link to="/">Главная</Link>
					</li>
					<li>
						<Link to="/profile">Профиль</Link>
					</li>
					{/* <li>
						<Link to="/tasks">Задания</Link>
					</li>
					<li>
						<Link to="/request">Получить задание</Link>
					</li> */}
					<li>
						<Link to="/notifications">Уведомления</Link>
					</li>
					{moderator ? <li>
						<Link to="/tasksObserver">Модератор</Link>
					</li> : null}
					{/* {moderator ? <li>
						<Link to="/faq">FAQ для модераторов</Link>
					</li> : null} */}
				</ul>
				<ul>
					{
						Object.keys(userPages).map(page => {
							return <li key={page}> <Link to={"/p/" + page}>
								{userPages[page].name}
							</Link> </li>
						})
					}

				</ul>
			</nav>
		</div>
	);

	const container = window !== undefined ? () => window().document.body : undefined;

	return (
		<div className={classes.root}>
			<CssBaseline />
			<AppBar position="fixed" className={classes.appBar}>
				<Toolbar>
					<IconButton
						color="inherit"
						aria-label="open drawer"
						edge="start"
						onClick={handleDrawerToggle}
						className={classes.menuButton}
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
									{messages.length > 0 ? messages.map((message, i) => (
										<Grid container key={message.id} className={classes.message} justify="flex-start" style={{ padding: 0 }}>
											<Typography style={{ flex: 1, padding: 10 }}>{message.title}</Typography>
											<Button style={{ padding: 10 }} onClick={() => updateFirestoreStatus(message.id)} size="small">скрыть</Button>
										</Grid>
									)) : <Typography className={classes.message} align="center" style={{ padding: 10 }}>Нет новых уведомлений</Typography>}
								</Grid>
							</Menu>
						</div>}
					{currentUser
						?
						<div>
							<span style={{ color: 'black', fontSize: 12, marginLeft: 7 }}>
								{currentUser.email}
							</span>
							<Button style={{ borderColor: "black", color: 'black', marginLeft: 10, fontSize: 12 }}
								variant="outlined" size="small"
								onClick={() => firebase.auth().signOut()}>
								Выход
							</Button>
						</div>
						: <Button style={{ borderColor: "black", color: 'black', marginLeft: 10, fontSize: 12 }} size="small" variant="outlined" onClick={signInWithGoogle}>вход</Button>
					}
				</Toolbar>
			</AppBar>
			<nav className={classes.drawer} aria-label="mailbox folders">
				{/* The implementation can be swapped with js to avoid SEO duplication of links. */}
				<Hidden smUp implementation="css">
					<Drawer
						container={container}
						variant="temporary"
						anchor={theme.direction === 'rtl' ? 'right' : 'left'}
						open={mobileOpen}
						onClose={handleDrawerToggle}
						classes={{
							paper: classes.drawerPaper,
						}}
						ModalProps={{
							keepMounted: true, // Better open performance on mobile.
						}}
					>
						{drawer}
					</Drawer>
				</Hidden>
				<Hidden xsDown implementation="css">
					<Drawer
						classes={{
							paper: classes.drawerPaper,
						}}
						variant="permanent"
						open
					>
						{drawer}
					</Drawer>
				</Hidden>
			</nav>
			<main className={classes.content}>
				<div className={classes.toolbar} />
				{props.children}
			</main>
		</div>
	);
}

ResponsiveDrawer.propTypes = {
	/**
	 * Injected by the documentation to work in an iframe.
	 * You won't need it on your project.
	 */
	window: PropTypes.func,
};

export default ResponsiveDrawer;
