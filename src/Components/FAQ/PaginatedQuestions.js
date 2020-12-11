import React, { useState, useEffect } from 'react'
import Grid from "@material-ui/core/Grid";
import TablePagination from "@material-ui/core/TablePagination";
import { List } from "immutable"
import Card from './Card'

const rowsPP = 5;

const PaginatedTasks = props => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(rowsPP);
    const [dataSlice, setDataSlice] = useState([]);

    const calculateSlice = (pageNumber, rowsPage, d) => {
        let data = List(d)
        const numberOfPages = Math.floor(data.size / rowsPage) + 1;
        console.log("numberOfPages", numberOfPages);
        const start = pageNumber * rowsPage;
        let end = data.size
        if (pageNumber !== numberOfPages - 1) {
            end = (pageNumber + 1) * rowsPage;
        }
        console.log("Start", start);
        console.log("End", end);
        return data.slice(start, end)
    }

    const handleChangePage = (event, newPage) => {
        setDataSlice(calculateSlice(newPage, rowsPerPage, props.data));
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setPage(0);
        setRowsPerPage(event.target.value);
        setDataSlice(calculateSlice(0, event.target.value, props.data));
    };

    useEffect(() => {
        // Update the document title using the browser API
        setPage(0)
        setDataSlice(calculateSlice(0, rowsPP, props.data));
    }, [props.data]);


    const pagination = props.data.length > 0 && (
        <Grid container justify="center">
            <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={props.data.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onChangePage={handleChangePage}
                onChangeRowsPerPage={handleChangeRowsPerPage}
            />
        </Grid>
    )

    console.log(props.data)


    // console.log('PAGINATION')
    // console.log(dataSlice)

    return (
        <div>
            {pagination}
            <Grid
                container
                spacing={0}
                direction="column"
                alignItems="center"
                justify="center"
                style={{ minHeight: '100vh' }}>
                {dataSlice.map((task, i) => (
                    <Card key={i} id={task.id} title={task.question.title} sendAnswer={props.sendAnswer} />
                ))}
            </Grid>
            {pagination}
        </div>
    )

}

export default PaginatedTasks