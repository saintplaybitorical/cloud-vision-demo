import React from 'react';
import { useTracker } from 'meteor/react-meteor-data';
import Box from '@material-ui/core/Box';
import Container from '@material-ui/core/Container';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';


import { PlaqueRecordsCollection } from '../api/plaqueRecords';
import { CamerasCollection } from '../api/cameras';

export const PlaqueRecords = () => {
  const [cameraId, setCameraId] = React.useState(0);

  const cameras= useTracker(() => {
    return CamerasCollection.find().fetch();
  });
  const plaques = useTracker(() => {
    return PlaqueRecordsCollection.find({ }, { sort: {timestamp: -1}, limit: 15 }).fetch();
  });

  return (
    <Box>
      <Container>
        <Box display="flex" flexDirection="row" justifyContent="space-around" alignItems="center" py={5}>
          <h1>Computer Vision Demo!</h1>
          <Box>
            <InputLabel>Camera</InputLabel>
            <Select
                value={cameraId}
                onChange={(event) => setCameraId(event.target.value)}
              >
                <MenuItem value={0}>No Filter</MenuItem>
                {cameras.map(camera => (
                  <MenuItem key={camera._id} value={camera.cameraId}>{camera.cameraId}</MenuItem>
                ))}
              </Select>
          </Box>
        </Box>
      </Container>
      <Box display="flex">
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="center">Date</TableCell>
                <TableCell align="center">Plate</TableCell>
                <TableCell align="center">Image</TableCell>
                <TableCell align="center">Camera</TableCell>
                <TableCell align="center">Score</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {plaques.filter(plaque => !cameraId || plaque.cameraId === cameraId).map((plaque) => (
                <TableRow key={plaque._id} id={plaque._id} hover>
                  <TableCell align="center">{new Date(plaque.timestamp).toLocaleString()}</TableCell>
                  <TableCell align="center">{plaque.plate.toUpperCase()}</TableCell>
                  <TableCell align="center">
                    <img src={`/static/${plaque.filename}`} alt={plaque.plate.toUpperCase()} width="80" />
                  </TableCell>
                  <TableCell align="center">{plaque.cameraId}</TableCell>
                  <TableCell align="center">{plaque.score}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  )
};
