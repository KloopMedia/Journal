import React, { useState } from 'react';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import TextField from '@material-ui/core/TextField';


const Feedback = (props) => {

    const [value, setValue] = useState(null)
    const [textValue, setTextValue] = useState('')
    const { returnAnswer } = props

    const handleChange = (event) => {
        setValue(event.target.value)
        returnAnswer({reason: event.target.value, text: textValue})
    };

    const handleTextChange = (event) => {
        setTextValue(event.target.value)
        returnAnswer({reason: value, text: event.target.value})
    }



    return (
        <div>
            <h4>{props.title}</h4>
            <FormControl const='fieldset' style={{paddingBottom: 15}}>
                <RadioGroup aria-label={props.title} name={props.title} value={value} onChange={handleChange}>
                    {props.answers.map((el, i) => <FormControlLabel
                        key={i}
                        value={el}
                        control={<Radio color="primary" />}
                        label={el}
                        disabled={props.locked ? true : false} />)}
                </RadioGroup>
            </FormControl>
            <TextField
                id={"feedback_input"}
                label="Примечание"
                value={textValue}
                onChange={handleTextChange}
                // required={required}
                multiline
                rows={5}
                variant="outlined"
                fullWidth
            />
        </div>
    )
}

export default Feedback