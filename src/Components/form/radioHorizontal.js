import React, {useState, useEffect} from 'react';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import '../../App.css'
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles({
	root: {
	  background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
	  border: 0,
	  borderRadius: 3,
	  boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
	  color: 'white',
	  height: 48,
	  padding: '0 30px',
	},
  });

export default function RadioHorizontal(props) {
	const classes = useStyles()
	const [value, setValue] = useState({});
	const [idx, setIdx] = useState({});
	let tmp = {}
	let idTmp = {}

	const {index, response} = props

	useEffect(() => {
		if (response) {
			setValue(response)
		}
	}, [response])

	const handleChange = id => event => {
		tmp = {...value}
		tmp[id] = event.target.value
		setValue(tmp)

		idTmp ={...idx}
		let i = props.answers.indexOf(event.target.value)
		idTmp[id] = i
		setIdx(idTmp)

		props.returnAnswer(tmp, index, idTmp)
	};

	const handleClear = () => {
		setValue({})
		props.returnAnswer({}, index)
	}

	return (
		<div className="radioHorizontal">
			<h4>{props.title}</h4>
			<button onClick={handleClear}>clear</button>
			<div className="question_item">
				{props.subquestion.map((question, id) =>
					<div className="question_item_" key={id}>
						<p>{question.q}</p>
						<FormControl component="fieldset">
							<RadioGroup aria-label="position" name="position" row value={value[id] ? value[id] : ""}
							            onClick={handleChange(id)}>
								{props.answers.map((el, i) =>
									<FormControlLabel
										key={i}
										value={el}
										control={<Radio color="primary"/>}
										// label={id > 0 ? "" : el}
										label={el}
										labelPlacement="top"
										disabled={props.locked ? true : false}
										style={{paddingLeft: 5, paddingRight: 5}}
									/>
								)}
							</RadioGroup>
						</FormControl>
					</div>
				)}
			</div>
		</div>

	);
}
