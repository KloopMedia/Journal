import React, {useEffect, useState} from 'react';
import FormLabel from '@material-ui/core/FormLabel';
import FormControl from '@material-ui/core/FormControl';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import { Typography } from '@material-ui/core';


export default function CheckboxesGroup(props) {
    const [state, setState] = React.useState({});
    const [ready, setReady] = useState(false)
    const {index, answers, required, response} = props

    useEffect(() => {
		if (response) {
			setState(response)
        }
        setReady(true)
    }, [response])


    const handleChange = (event) => {
        setState({ ...state, [event.target.name]: event.target.checked });
        props.returnAnswer({...state, [event.target.name]: event.target.checked}, index)
    };

    return (
        ready ?
        <div>
            <Typography variant="h6" style={{marginBottom: 0, marginTop: 20}}>{props.title}</Typography>
            <FormControl component="fieldset">
                <FormLabel component="legend">Выберите один или несколько вариантов</FormLabel>
                <FormGroup>
                    {answers.map((el, i) => (
                        <FormControlLabel
                            key={i}
                            control={<Checkbox checked={state[el]} onChange={handleChange} name={el} />}
                            label={el}
                        />
                    ))}
                </FormGroup>
            </FormControl>
        </div> : null
    );
}
