import React, { useEffect } from 'react';
import { Typography } from '@material-ui/core';



function BasicTextFields(props) {

	const {title} = props

	return (
		<div>
			<Typography variant="h6" style={{marginBottom: 0, marginTop: 20}}>{title}</Typography>
		</div>
	);
}

export default BasicTextFields